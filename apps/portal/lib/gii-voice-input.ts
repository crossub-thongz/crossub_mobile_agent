import { VOICE_STOP_BUFFER_MS } from '@/constants/voice-input';
import { transcribeGiiVoice } from '@/lib/crossub-api/gii-client';

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

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
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
 * Hold-to-talk: record with MediaRecorder, transcribe on the server (Deepgram/Whisper).
 * Unlike Chrome Web Speech, this shows a real fetch in DevTools and does not depend on Google.
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
    options.onError('Microphone is already active — release the other Gii mic first');
    return null;
  }

  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    options.onError('Voice input is not supported in this browser');
    return null;
  }

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let holding = true;
  let handled = false;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  let recordingMime = pickRecorderMimeType() || 'audio/webm';
  let transcribing = false;

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

  const transcribeRecording = async () => {
    if (handled || transcribing) return;
    transcribing = true;
    const blob = new Blob(chunks, { type: recordingMime });
    chunks = [];

    if (blob.size < 800) {
      fail('Could not hear you clearly — hold the mic a little longer or type your question');
      return;
    }

    try {
      const audioBase64 = await blobToBase64(blob);
      const result = await transcribeGiiVoice({
        audioBase64,
        mediaType: recordingMime,
        languageHint: languageHintForTranscription(),
      });
      const text = result.text.trim();
      if (text) {
        options.onTranscript(text);
        complete(text);
        return;
      }
      fail('Could not hear you clearly — try again or type your question');
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 503) {
        fail(
          'Voice transcription is not available on this server yet — type your question for now',
        );
        return;
      }
      fail('Could not transcribe your voice — check your connection or type your question');
    }
  };

  const stopRecording = () => {
    if (!recorder || recorder.state === 'inactive') {
      void transcribeRecording();
      return;
    }
    recorder.onstop = () => {
      void transcribeRecording();
    };
    try {
      recorder.stop();
    } catch {
      void transcribeRecording();
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
        fail('Could not record audio — try again or type your question');
      };
      recorder.start(200);
      options.onListening();
    } catch {
      activeVoiceSession = null;
      fail('Microphone access is blocked — allow mic permission and try again');
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
      if (handled || holding) return;
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
