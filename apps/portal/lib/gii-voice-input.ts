import {
  VOICE_ERROR,
  VOICE_MAX_SESSION_MS,
  VOICE_MIN_CLIP_BYTES,
  VOICE_SILENCE_SAMPLE_MS,
  VOICE_SILENCE_TIMEOUT_MS,
  VOICE_SPEECH_RMS_THRESHOLD,
} from '@/constants/voice-input';
import { fetchGiiVoiceStatus, transcribeGiiVoice } from '@/lib/crossub-api/gii-client';
import {
  browserSpeechSupported,
  startBrowserSpeech,
  type GiiBrowserSpeech,
} from '@/lib/gii-browser-speech';

/** One mic session app-wide — two Gii panels must not listen at once. */
let activeVoiceSession: { abort: () => void } | null = null;

export function giiVoiceSessionActive(): boolean {
  return activeVoiceSession != null;
}

export function resolveSpeechLanguage(): string {
  if (typeof navigator === 'undefined') return 'en-AU';
  const lang = navigator.language || 'en-AU';
  if (lang.startsWith('zh')) return lang.includes('TW') ? 'zh-TW' : 'zh-CN';
  if (lang.startsWith('ms')) return 'ms-MY';
  if (lang.startsWith('vi')) return 'vi-VN';
  if (lang.startsWith('ja')) return 'ja-JP';
  if (lang.startsWith('ko')) return 'ko-KR';
  if (lang.startsWith('en')) return 'en-AU';
  return lang;
}

function languageHintForTranscription(): string | undefined {
  const lang = resolveSpeechLanguage();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Which transcriber this environment has                                     */
/* -------------------------------------------------------------------------- */

/**
 * Server ASR is per-environment (it needs a Deepgram/OpenAI key), so the app asks once and
 * remembers. Only a definitive answer is cached: a failed probe stays unknown so a network
 * blip does not pin the session to the fallback for good.
 */
let serverAsrAvailable: boolean | null = null;
let statusProbe: Promise<boolean> | null = null;

async function resolveServerAsr(): Promise<boolean> {
  if (serverAsrAvailable !== null) return serverAsrAvailable;
  if (!statusProbe) {
    statusProbe = fetchGiiVoiceStatus()
      .then((status) => {
        serverAsrAvailable = status.available;
        return status.available;
      })
      .catch(() => false)
      .finally(() => {
        statusProbe = null;
      });
  }
  return statusProbe;
}

/** Warm the capability probe when the Gii panel opens, so the first mic tap is instant. */
export function primeGiiVoiceStatus(): void {
  if (typeof window === 'undefined') return;
  void resolveServerAsr();
}

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function canRecordAudio(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/**
 * Watch a live mic stream and call back once it has been quiet for `timeoutMs`.
 *
 * The recorder path has no transcript to time silence against — the words only arrive after
 * the upload — so silence is measured from the audio itself. Returns a teardown function;
 * an environment without Web Audio simply never trips (the session cap still bounds it).
 */
function watchForSilence(
  stream: MediaStream,
  timeoutMs: number,
  onSilent: () => void,
): () => void {
  const AudioCtor =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  if (!AudioCtor) return () => {};

  let ctx: AudioContext;
  try {
    ctx = new AudioCtor();
  } catch {
    return () => {};
  }

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);

  let quietFor = 0;
  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const deviation = samples[i]! - 128;
      sumSquares += deviation * deviation;
    }
    const rms = Math.sqrt(sumSquares / samples.length);

    if (rms >= VOICE_SPEECH_RMS_THRESHOLD) {
      quietFor = 0;
      return;
    }
    quietFor += VOICE_SILENCE_SAMPLE_MS;
    if (quietFor >= timeoutMs) onSilent();
  }, VOICE_SILENCE_SAMPLE_MS);

  return () => {
    clearInterval(timer);
    void ctx.close().catch(() => {});
  };
}

export type GiiVoiceCapture = {
  /** Stop listening and send whatever was heard. */
  stop: () => void;
  /** Drop the session without sending. */
  abort: () => void;
  /** True once listening has ended and the transcript is still being settled. */
  isSettling: () => boolean;
};

/**
 * Tap-to-talk for Gii, over whichever transcriber this environment actually has.
 *
 * Tap starts the session; `stop()` ends it and sends. It also ends itself after
 * VOICE_SILENCE_TIMEOUT_MS of silence, measured from the audio on the recorder path and from
 * transcript activity on the browser path — a mic left on should not sit there listening.
 *
 * Server ASR (Deepgram/Whisper) is preferred — accurate, works in every browser, no Google
 * round-trip — but it only exists where an ASR key is configured, so the browser's own
 * recogniser stands behind it. Which one runs is decided BEFORE recording starts:
 *
 * - server available → record and upload (the browser recogniser stays out of it).
 * - server unavailable → browser recogniser only; no pointless upload.
 * - probe itself failed → run both and prefer the server's answer, so an unreachable probe
 *   costs a little extra work rather than the session.
 *
 * The one case that fails is neither being available, and that is reported on the tap rather
 * than after the agent has finished speaking.
 */
export function startGiiVoiceCapture(options: {
  lang?: string;
  onListening: () => void;
  onWrapping: () => void;
  onIdle: () => void;
  onTranscript: (text: string) => void;
  onComplete: (text: string) => void;
  onError: (message: string) => void;
}): GiiVoiceCapture | null {
  if (typeof window === 'undefined') return null;

  if (activeVoiceSession) {
    options.onError(VOICE_ERROR.BUSY);
    return null;
  }

  const recorderSupported = canRecordAudio();
  const browserAsr = browserSpeechSupported();

  if (!recorderSupported && !browserAsr) {
    options.onError(VOICE_ERROR.UNSUPPORTED);
    return null;
  }
  if (serverAsrAvailable === false && !browserAsr) {
    options.onError(VOICE_ERROR.NO_TRANSCRIBER);
    return null;
  }

  // Upload only where it can be transcribed; listen locally unless the server has it covered.
  // Both are re-decided once the capability probe lands (see the startup block below).
  let useRecorder = recorderSupported && serverAsrAvailable !== false;
  let useBrowserAsr = browserAsr && serverAsrAvailable !== true;

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let speech: GiiBrowserSpeech | null = null;
  let listening = true;
  let handled = false;
  let recordingMime = pickRecorderMimeType() || 'audio/webm';
  let resolving = false;
  let stopSilenceWatch: (() => void) | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionCap: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    stopSilenceWatch?.();
    stopSilenceWatch = null;
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (sessionCap) {
      clearTimeout(sessionCap);
      sessionCap = null;
    }
  };

  const cleanupStream = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    recorder = null;
  };

  const finishIdle = () => {
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    clearTimers();
    cleanupStream();
    speech?.abort();
    speech = null;
    options.onIdle();
  };

  const fail = (message: string) => {
    if (handled) return;
    handled = true;
    listening = false;
    finishIdle();
    options.onError(message);
  };

  const complete = (text: string) => {
    if (handled) return;
    handled = true;
    listening = false;
    finishIdle();
    options.onComplete(text);
  };

  /**
   * Server ASR for this clip. `text` is null when nothing came back; `errored` separates
   * "the call failed" from "the clip was silent", which are different things to tell an agent.
   */
  const transcribeOnServer = async (
    blob: Blob,
  ): Promise<{ text: string | null; errored: boolean }> => {
    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await transcribeGiiVoice({
        audioBase64,
        mediaType: recordingMime,
        languageHint: languageHintForTranscription(),
      });
      serverAsrAvailable = true;
      return { text: result.text.trim() || null, errored: false };
    } catch (err) {
      const status = (err as { status?: number }).status;
      // 503 (no ASR key) and 404 (an API that predates the endpoint) both mean: stop asking.
      if (status === 503 || status === 404) serverAsrAvailable = false;
      return { text: null, errored: true };
    }
  };

  /** Settle the session: server transcript first, browser transcript behind it. */
  const resolveTranscript = async () => {
    if (handled || resolving) return;
    resolving = true;
    clearTimers();

    const heardLocally = speech ? await speech.stop() : '';
    const asrError = speech?.lastError() ?? '';
    if (handled) return;

    const clip = useRecorder ? new Blob(chunks, { type: recordingMime }) : null;
    chunks = [];
    const clipUsable = clip !== null && clip.size >= VOICE_MIN_CLIP_BYTES;
    let serverErrored = false;

    if (clip && clipUsable) {
      const attempt = await transcribeOnServer(clip);
      serverErrored = attempt.errored;
      if (attempt.text) {
        options.onTranscript(attempt.text);
        complete(attempt.text);
        return;
      }
    }

    if (heardLocally) {
      options.onTranscript(heardLocally);
      complete(heardLocally);
      return;
    }

    // Nothing came back. Each dead end reads differently to the agent holding the phone.
    if (clip && !clipUsable) {
      fail(VOICE_ERROR.TOO_SHORT);
      return;
    }
    if (serverErrored && !speech) {
      fail(serverAsrAvailable === false ? VOICE_ERROR.NO_TRANSCRIBER : VOICE_ERROR.FAILED);
      return;
    }
    if (speech && asrError === 'network') {
      fail(VOICE_ERROR.ASR_UNREACHABLE);
      return;
    }
    fail(VOICE_ERROR.NO_SPEECH);
  };

  /** End the session and hand off to the transcriber. Idempotent. */
  const stopListening = () => {
    if (handled || !listening) return;
    listening = false;
    clearTimers();
    options.onWrapping();

    if (!useRecorder || !recorder || recorder.state === 'inactive') {
      void resolveTranscript();
      return;
    }
    recorder.onstop = () => {
      void resolveTranscript();
    };
    try {
      recorder.stop();
    } catch {
      void resolveTranscript();
    }
  };

  /** The browser path times silence from transcript activity — it has no audio to measure. */
  const restartTranscriptSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(stopListening, VOICE_SILENCE_TIMEOUT_MS);
  };

  const abortSession = () => {
    if (handled) return;
    handled = true;
    listening = false;
    chunks = [];
    finishIdle();
  };

  activeVoiceSession = { abort: abortSession };

  void (async () => {
    // The probe usually resolved when the panel opened; awaiting it costs nothing then, and
    // on a cold first tap it is what stops us recording audio nobody can transcribe.
    if (serverAsrAvailable === null) await resolveServerAsr();
    if (handled) return;

    useRecorder = recorderSupported && serverAsrAvailable !== false;
    useBrowserAsr = browserAsr && serverAsrAvailable !== true;
    if (!useRecorder && !useBrowserAsr) {
      fail(VOICE_ERROR.NO_TRANSCRIBER);
      return;
    }

    // A stop that beat the startup already moved the UI on — don't drag it back.
    const announceListening = () => {
      if (!handled && listening) options.onListening();
    };

    if (useBrowserAsr) {
      speech = startBrowserSpeech({
        lang: options.lang ?? resolveSpeechLanguage(),
        onInterim: (text) => {
          if (handled || !listening) return;
          if (text) options.onTranscript(text);
          restartTranscriptSilenceTimer();
        },
      });
      if (speech) restartTranscriptSilenceTimer();
    }

    if (handled || !listening) return;

    sessionCap = setTimeout(stopListening, VOICE_MAX_SESSION_MS);

    if (!useRecorder) {
      if (!speech) {
        fail(VOICE_ERROR.NO_TRANSCRIBER);
        return;
      }
      announceListening();
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (handled || !listening) {
        cleanupStream();
        return;
      }
      recorder = recordingMime
        ? new MediaRecorder(stream, { mimeType: recordingMime })
        : new MediaRecorder(stream);
      recordingMime = recorder.mimeType || recordingMime;
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        // The browser recogniser may still be listening — let the stop settle it.
        if (!speech) fail(VOICE_ERROR.RECORD_FAILED);
      };
      recorder.start(200);

      // Audio-measured silence supersedes the transcript timer on this path.
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      stopSilenceWatch = watchForSilence(stream, VOICE_SILENCE_TIMEOUT_MS, stopListening);
      announceListening();
    } catch {
      // The browser recogniser holds its own mic grant, so if it is running the session can
      // still land — only drop out when there is nothing else listening.
      if (speech) {
        useRecorder = false;
        announceListening();
        return;
      }
      fail(VOICE_ERROR.MIC_BLOCKED);
    }
  })();

  return {
    stop: stopListening,
    abort: abortSession,
    isSettling: () => !handled && !listening,
  };
}
