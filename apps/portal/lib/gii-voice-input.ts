import {
  VOICE_ERROR,
  VOICE_MIN_CLIP_BYTES,
  VOICE_STOP_BUFFER_MS,
} from '@/constants/voice-input';
import { fetchGiiVoiceStatus, transcribeGiiVoice } from '@/lib/crossub-api/gii-client';
import {
  browserSpeechSupported,
  startBrowserSpeech,
  type GiiBrowserSpeech,
} from '@/lib/gii-browser-speech';

/** One mic session app-wide — two Gii panels must not record at once. */
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

/** Warm the capability probe when the Gii panel opens, so the first mic press is instant. */
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

export type GiiVoiceCapture = {
  release: () => void;
  resumeHold: () => void;
  isWrapping: () => boolean;
  abort: () => void;
};

/**
 * Hold-to-talk for Gii, over whichever transcriber this environment actually has.
 *
 * Server ASR (Deepgram/Whisper) is preferred — accurate, works in every browser, no Google
 * round-trip — but it only exists where an ASR key is configured. So the browser's own
 * recogniser runs as the fallback, and the two are chosen BEFORE recording starts:
 *
 * - server available → record and upload (the browser recogniser stays out of it).
 * - server unavailable → browser recogniser only; no pointless upload.
 * - probe itself failed → run both and prefer the server's answer, so an unreachable probe
 *   costs a little extra work rather than the press.
 *
 * The one case that fails is neither being available, and that is reported on the press
 * rather than after the agent has finished speaking.
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
  let holding = true;
  let handled = false;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  let recordingMime = pickRecorderMimeType() || 'audio/webm';
  let resolving = false;

  const cleanupStream = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    recorder = null;
  };

  const finishIdle = () => {
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    cleanupStream();
    speech?.abort();
    speech = null;
    options.onIdle();
  };

  const fail = (message: string) => {
    if (handled) return;
    handled = true;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    finishIdle();
    options.onError(message);
  };

  const complete = (text: string) => {
    if (handled) return;
    handled = true;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
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

  /** Settle the hold: server transcript first, browser transcript behind it. */
  const resolveTranscript = async () => {
    if (handled || resolving) return;
    resolving = true;

    const heardLocally = speech ? await speech.stop() : '';
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

    // Nothing came back. A mis-tap, a silent hold and a failed call each read differently.
    if (clip && !clipUsable) {
      fail(VOICE_ERROR.TOO_SHORT);
      return;
    }
    if (serverErrored && !speech) {
      fail(serverAsrAvailable === false ? VOICE_ERROR.NO_TRANSCRIBER : VOICE_ERROR.FAILED);
      return;
    }
    fail(VOICE_ERROR.NO_SPEECH);
  };

  const stopRecording = () => {
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

  const abortSession = () => {
    if (handled) return;
    handled = true;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    chunks = [];
    finishIdle();
  };

  activeVoiceSession = { abort: abortSession };

  void (async () => {
    // The probe usually resolved when the panel opened; awaiting it costs nothing then, and
    // on a cold first press it is what stops us recording audio nobody can transcribe.
    if (serverAsrAvailable === null) await resolveServerAsr();
    if (handled) return;

    useRecorder = recorderSupported && serverAsrAvailable !== false;
    useBrowserAsr = browserAsr && serverAsrAvailable !== true;
    if (!useRecorder && !useBrowserAsr) {
      fail(VOICE_ERROR.NO_TRANSCRIBER);
      return;
    }

    if (useBrowserAsr) {
      speech = startBrowserSpeech({
        lang: options.lang ?? resolveSpeechLanguage(),
        onInterim: (text) => {
          if (!handled && text) options.onTranscript(text);
        },
      });
    }

    // A release that beat the startup already moved the UI on — don't drag it back.
    const announceListening = () => {
      if (!handled && holding) options.onListening();
    };

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
      if (handled || !holding) {
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
        // The browser recogniser may still be listening — let the release settle it.
        if (!speech) fail(VOICE_ERROR.RECORD_FAILED);
      };
      recorder.start(200);
      announceListening();
    } catch {
      // The browser recogniser holds its own mic grant, so if it is running the press can
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
    release: () => {
      if (handled || !holding) return;
      holding = false;
      options.onWrapping();
      stopTimer = setTimeout(() => {
        stopTimer = null;
        stopRecording();
      }, VOICE_STOP_BUFFER_MS);
    },
    resumeHold: () => {
      if (handled || holding || resolving) return;
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }
      holding = true;
      options.onListening();
    },
    isWrapping: () => !handled && !holding && stopTimer !== null,
    abort: abortSession,
  };
}
