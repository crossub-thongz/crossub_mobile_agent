import { VOICE_STOP_BUFFER_MS } from '@/constants/voice-input';

/** One browser speech session app-wide — two Gii panels must not open the mic together. */
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

function voiceErrorMessage(code: string): string {
  if (code === 'not-allowed') {
    return 'Microphone access is blocked — allow mic permission and try again';
  }
  if (code === 'network') {
    return 'Voice recognition unavailable — check your connection or type your question';
  }
  if (code === 'no-speech') {
    return 'Could not hear you clearly — try again or type your question';
  }
  return 'Could not hear you clearly — try again or type your question';
}

export type GiiVoiceCapture = {
  /** Pointer released — finish after the stop buffer. */
  release: () => void;
  /** Pressed again during the release buffer — keep the same utterance going. */
  resumeHold: () => void;
  /** True between release and the stop buffer firing. */
  isWrapping: () => boolean;
  /** Tear down immediately (unmount). */
  abort: () => void;
};

/**
 * Hold-to-talk speech capture. Uses short recognition passes restarted while the button
 * is held — more reliable in Chrome than `continuous: true`, which often throws `network`.
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

  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    options.onError('Voice input is not supported in this browser');
    return null;
  }

  let recognition: SpeechRecognition | null = new SpeechRecognitionCtor();
  let holding = true;
  let handled = false;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = '';
  let lastError = '';

  const clearTimers = () => {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const teardown = (abortRecognition: boolean) => {
    clearTimers();
    holding = false;
    const rec = recognition;
    recognition = null;
    if (abortRecognition && rec) {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    options.onIdle();
  };

  const finish = (submit: boolean, errorCode?: string) => {
    if (handled) return;
    handled = true;
    clearTimers();
    holding = false;
    const text = finalTranscript.trim();
    const rec = recognition;
    recognition = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    options.onIdle();
    if (submit && text) {
      options.onComplete(text);
      return;
    }
    if (!text) {
      options.onError(voiceErrorMessage(errorCode ?? lastError ?? 'no-speech'));
    }
  };

  const scheduleRestart = () => {
    if (!holding || handled || !recognition) return;
    if (restartTimer) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (!holding || handled || !recognition) return;
      try {
        recognition.start();
      } catch {
        scheduleRestart();
      }
    }, 80);
  };

  const bindRecognition = (rec: SpeechRecognition) => {
    rec.lang = options.lang ?? resolveSpeechLanguage();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      if (handled) return;
      options.onListening();
    };

    rec.onresult = (event) => {
      if (handled) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i]?.[0]?.transcript ?? '';
        if (event.results[i]?.isFinal) {
          finalTranscript += piece;
        } else {
          interim += piece;
        }
      }
      options.onTranscript((finalTranscript + interim).trim());
    };

    rec.onerror = (event) => {
      if (handled) return;
      if (event.error === 'aborted') return;
      lastError = event.error;
      const captured = (finalTranscript + '').trim();
      if (captured && !holding) {
        finish(true);
        return;
      }
      if (holding && (event.error === 'network' || event.error === 'no-speech')) {
        scheduleRestart();
        return;
      }
      if (!holding) {
        finish(false, event.error);
      }
    };

    rec.onend = () => {
      if (handled) return;
      if (holding) {
        scheduleRestart();
        return;
      }
      finish(true);
    };
  };

  bindRecognition(recognition);

  const abortSession = () => {
    if (handled) return;
    handled = true;
    teardown(true);
  };

  activeVoiceSession = { abort: abortSession };

  try {
    recognition.start();
  } catch {
    activeVoiceSession = null;
    recognition = null;
    options.onError('Could not start voice input — try again or type your question');
    options.onIdle();
    return null;
  }

  return {
    release: () => {
      if (handled || !holding) return;
      holding = false;
      options.onWrapping();
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (handled || !recognition) return;
        try {
          recognition.stop();
        } catch {
          finish(finalTranscript.trim().length > 0, lastError);
        }
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
