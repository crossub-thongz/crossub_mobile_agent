import {
  micSilentMessage,
  VOICE_CAPTURE_CONSTRAINTS,
  VOICE_ERROR,
  VOICE_LEVEL_FULL_SCALE_RMS,
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
 * remembers.
 *
 * Only a definitive answer is cached. A blip, or an API too old to have the probe, leaves
 * this unknown — and unknown means TRY, because the transcribe endpoint shipped before the
 * probe did: an environment can be transcribing happily while answering 404 here. Concluding
 * "no server ASR" from a missing probe would route every session to the browser recogniser
 * and never once call the endpoint that works.
 */
let serverAsrAvailable: boolean | null = null;
let statusProbe: Promise<boolean | null> | null = null;

async function resolveServerAsr(): Promise<boolean | null> {
  // `true` is sticky; `false` deliberately is not.
  //
  // A tab open while the key is being added to the server would otherwise hold "no ASR" for
  // as long as it stays open, and keep saying so however many times the agent taps — the one
  // person who does not know a deploy just happened is the one using the app. Re-probing on
  // a negative costs one small GET on the path that is already failing.
  if (serverAsrAvailable === true) return true;
  if (!statusProbe) {
    statusProbe = fetchGiiVoiceStatus()
      .then((status) => {
        if (status.available !== null) serverAsrAvailable = status.available;
        return status.available;
      })
      .catch(() => null)
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

export type MicLevelWatch = {
  stop: () => void;
  /**
   * True once the meter actually took a reading. A meter that never ran knows nothing — and
   * must not be mistaken for one reporting silence.
   */
  ran: () => boolean;
  /** True once the mic has delivered anything above the speech threshold. */
  heardSound: () => boolean;
};

/**
 * Meter a live mic stream: report its level, and call back once it has been quiet for
 * `timeoutMs`.
 *
 * Two jobs, both needed. The recorder path has no transcript to time silence against — the
 * words only arrive after the upload — so silence has to be measured from the audio itself.
 * And whether any sound reached the browser AT ALL is the one fact that separates "we could
 * not make out your words" from "your mic is not capturing", which are the same message to a
 * user and completely different problems.
 *
 * **Nothing here may stop a session unless the meter is provably running.** An AudioContext
 * that starts suspended reports pure silence forever, and a detector that cannot hear must
 * never be the thing that cuts someone off mid-sentence — so silence only accrues while the
 * context is `running`, and an environment without Web Audio simply never trips it.
 */
function watchMicLevel(
  stream: MediaStream,
  options: {
    timeoutMs: number;
    onSilent: () => void;
    onLevel?: (level: number) => void;
  },
): MicLevelWatch {
  const AudioCtor =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  const inert: MicLevelWatch = {
    stop: () => {},
    ran: () => false,
    heardSound: () => false,
  };
  if (!AudioCtor) return inert;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtor();
  } catch {
    return inert;
  }

  // Created inside an async continuation, a context can land suspended even though the tap
  // that started all this was a real user gesture.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);

  let quietFor = 0;
  let heardSound = false;
  let sampled = false;

  const timer = setInterval(() => {
    if (ctx.state !== 'running') return;
    sampled = true;

    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const deviation = samples[i]! - 128;
      sumSquares += deviation * deviation;
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    options.onLevel?.(Math.min(1, rms / VOICE_LEVEL_FULL_SCALE_RMS));

    if (rms >= VOICE_SPEECH_RMS_THRESHOLD) {
      heardSound = true;
      quietFor = 0;
      return;
    }
    quietFor += VOICE_SILENCE_SAMPLE_MS;
    if (quietFor >= options.timeoutMs) options.onSilent();
  }, VOICE_SILENCE_SAMPLE_MS);

  return {
    stop: () => {
      clearInterval(timer);
      void ctx.close().catch(() => {});
    },
    ran: () => sampled,
    heardSound: () => heardSound,
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
 * - server available → record and upload.
 * - server unavailable → browser recogniser only, owning the mic alone; no pointless upload.
 * - status unknown → the recorder goes first, because the transcribe endpoint predates the
 *   status probe and may well work; a 503 settles it and the next tap uses the recogniser.
 *
 * Exactly one of them runs per session — see the startup block for why that matters.
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
  /** 0–1 mic level, ~7×/second. Drives the button so "listening" is observable, not implied. */
  onLevel?: (level: number) => void;
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
  // No early refusal on a cached `false` — the probe re-runs below, and a server that has
  // since gained a key should be found on this tap rather than after a reload. The startup
  // block reports NO_TRANSCRIBER once there is a fresh answer to report it from.

  // Upload only where it can be transcribed; listen locally unless the server has it covered.
  // Both are re-decided once the capability probe lands (see the startup block below).
  let useRecorder = recorderSupported && serverAsrAvailable !== false;
  let useBrowserAsr = browserAsr && serverAsrAvailable !== true;

  let stream: MediaStream | null = null;
  /** Clone fed to the level meter, so it never contends with the recorder for the track. */
  let meterStream: MediaStream | null = null;
  /** Named in the "no sound" message — the wrong input is the usual cause. */
  let captureDeviceLabel: string | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let speech: GiiBrowserSpeech | null = null;
  let listening = true;
  let handled = false;
  let recordingMime = pickRecorderMimeType() || 'audio/webm';
  let resolving = false;
  let meter: MicLevelWatch | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionCap: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    meter?.stop();
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
    meterStream?.getTracks().forEach((t) => t.stop());
    stream = null;
    meterStream = null;
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
      // Reaching the endpoint at all proves the capability, whatever this clip contained.
      serverAsrAvailable = true;
      return { text: result.text.trim() || null, errored: false };
    } catch (err) {
      const status = (err as { status?: number }).status;
      // 404 means the endpoint is absent. 503 means the server says it cannot transcribe —
      // trusted only because the server no longer returns it for an empty transcript, which
      // used to take voice out of service for a whole session over one quiet clip.
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

    // Nothing came back. Each dead end is a different thing for the agent to do about it, and
    // the meter is what tells them apart: whether any sound reached the browser at all
    // separates a mic that is not capturing from words that could not be made out.
    // Order matters: the server having no ASR is the most actionable fact available, and it
    // outranks the browser recogniser's complaint — on a network where Google is unreachable
    // the recogniser ALWAYS reports `network`, and letting that win would point every agent
    // at their own connection when the fix is one key on the server.
    if (serverAsrAvailable === false) {
      fail(VOICE_ERROR.NO_TRANSCRIBER);
      return;
    }
    if (serverErrored && !speech) {
      fail(VOICE_ERROR.FAILED);
      return;
    }
    if (speech && asrError === 'network') {
      fail(VOICE_ERROR.ASR_UNREACHABLE);
      return;
    }
    if (meter?.heardSound()) {
      fail(VOICE_ERROR.TRANSCRIBER_EMPTY);
      return;
    }
    if (meter?.ran()) {
      fail(micSilentMessage(captureDeviceLabel));
      return;
    }
    fail(clip && !clipUsable ? VOICE_ERROR.TOO_SHORT : VOICE_ERROR.NO_SPEECH);
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

    // Exactly one capture path per session, never both. Holding a `getUserMedia` stream while
    // the browser recogniser is listening is a documented way to provoke its `network` error,
    // and the recogniser owning the mic alone is the configuration that worked here.
    //
    // So when the server's status is unknown, the recorder goes first: a 503 from the upload
    // teaches us the truth once, and every tap after that uses the recogniser on its own.
    useRecorder = recorderSupported && serverAsrAvailable !== false;
    useBrowserAsr = browserAsr && !useRecorder;
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

    // The metering stream is opened ONLY where we already need one to record.
    //
    // It is tempting to open one on the browser path too, for the diagnosis it gives — and
    // that is exactly what must not happen. The configuration that worked in this app never
    // touched `getUserMedia`: the recogniser owned the mic alone. Holding a second capture
    // alongside it is a documented way to provoke the `network` error, so metering that path
    // risks *causing* the failure it was added to explain. Silence there is timed from
    // transcript activity instead.
    if (!useRecorder) {
      if (!speech) {
        fail(VOICE_ERROR.NO_TRANSCRIBER);
        return;
      }
      announceListening();
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: VOICE_CAPTURE_CONSTRAINTS,
      });
    } catch {
      // Permission covers both paths, but the recogniser holds its own grant — if it is
      // already listening the session can still land, just without a meter.
      if (speech) {
        useRecorder = false;
        announceListening();
        return;
      }
      fail(VOICE_ERROR.MIC_BLOCKED);
      return;
    }

    if (handled || !listening) {
      cleanupStream();
      return;
    }

    captureDeviceLabel = stream.getAudioTracks()[0]?.label ?? null;

    if (useRecorder) {
      try {
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
      } catch {
        if (!speech) {
          fail(VOICE_ERROR.RECORD_FAILED);
          return;
        }
        useRecorder = false;
      }
    }

    // Meter a CLONE, not the recorder's own stream. One track feeding both a MediaRecorder
    // and a Web Audio graph is a combination Chrome has historically handed silence to, and a
    // meter that steals from the recording would be worse than no meter at all.
    meterStream = stream.clone();

    // Measured silence supersedes the transcript timer wherever we have audio to measure.
    meter = watchMicLevel(meterStream, {
      timeoutMs: VOICE_SILENCE_TIMEOUT_MS,
      onSilent: stopListening,
      onLevel: (level) => {
        if (!handled && listening) options.onLevel?.(level);
      },
    });
    // On the recorder path there are no transcript events to reset a timer, so the audio
    // meter is the only silence signal. On the browser path both stay armed: whichever sees
    // five quiet seconds first is right, and a recogniser that has gone quiet while the meter
    // still hears speech is exactly the case worth ending and reporting.
    if (useRecorder && silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }

    announceListening();
  })();

  return {
    stop: stopListening,
    abort: abortSession,
    isSettling: () => !handled && !listening,
  };
}
