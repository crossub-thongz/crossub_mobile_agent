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
    return 'Voice recognition unavailable — use Chrome, check your connection, or type your question';
  }
  if (code === 'no-speech') {
    return 'Could not hear you clearly — try again or type your question';
  }
  return 'Could not hear you clearly — try again or type your question';
}

export type GiiVoiceCapture = {
  release: () => void;
  resumeHold: () => void;
  isWrapping: () => boolean;
  abort: () => void;
};

/**
 * Hold-to-talk speech capture. Chrome cannot reliably restart the same
 * SpeechRecognition after a network/onend error — each pass uses a fresh instance.
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
    options.onError('Voice input is not supported in this browser — try Chrome');
    return null;
  }

  let recognition: SpeechRecognition | null = null;
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

  const detachRecognition = (rec: SpeechRecognition) => {
    rec.onstart = null;
    rec.onend = null;
    rec.onerror = null;
    rec.onresult = null;
    try {
      rec.abort();
    } catch {
      // ignore
    }
  };

  const finish = (submit: boolean, errorCode?: string) => {
    if (handled) return;
    handled = true;
    clearTimers();
    holding = false;
    if (recognition) {
      detachRecognition(recognition);
      recognition = null;
    }
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    options.onIdle();
    const text = finalTranscript.trim();
    if (submit && text) {
      options.onComplete(text);
      return;
    }
    if (!text) {
      options.onError(voiceErrorMessage(errorCode ?? lastError ?? 'no-speech'));
    }
  };

  const scheduleRestart = (delayMs = 220) => {
    if (!holding || handled) return;
    if (restartTimer) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      beginPass();
    }, delayMs);
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

      const captured = finalTranscript.trim();
      if (captured && !holding) {
        finish(true);
        return;
      }

      if (holding && (event.error === 'network' || event.error === 'no-speech')) {
        if (recognition === rec) {
          detachRecognition(rec);
          recognition = null;
        }
        scheduleRestart(event.error === 'network' ? 320 : 180);
        return;
      }

      if (!holding) {
        finish(false, event.error);
      }
    };

    rec.onend = () => {
      if (handled) return;
      if (recognition === rec) {
        recognition = null;
      }
      if (holding) {
        scheduleRestart();
        return;
      }
      finish(true);
    };
  };

  const beginPass = () => {
    if (handled || !holding) return;

    if (recognition) {
      detachRecognition(recognition);
      recognition = null;
    }

    const rec = new SpeechRecognitionCtor();
    recognition = rec;
    bindRecognition(rec);

    try {
      rec.start();
    } catch {
      if (recognition === rec) {
        recognition = null;
      }
      scheduleRestart();
    }
  };

  const abortSession = () => {
    if (handled) return;
    handled = true;
    clearTimers();
    holding = false;
    if (recognition) {
      detachRecognition(recognition);
      recognition = null;
    }
    if (activeVoiceSession?.abort === abortSession) {
      activeVoiceSession = null;
    }
    options.onIdle();
  };

  activeVoiceSession = { abort: abortSession };
  beginPass();

  return {
    release: () => {
      if (handled || !holding) return;
      holding = false;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      options.onWrapping();
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (handled) return;
        if (recognition) {
          try {
            recognition.stop();
          } catch {
            finish(finalTranscript.trim().length > 0, lastError);
          }
          return;
        }
        finish(finalTranscript.trim().length > 0, lastError);
      }, VOICE_STOP_BUFFER_MS);
    },
    resumeHold: () => {
      if (handled || holding) return;
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }
      holding = true;
      if (!recognition && !restartTimer) {
        beginPass();
      }
      options.onListening();
    },
    isWrapping: () => !handled && !holding && stopTimer !== null,
    abort: abortSession,
  };
}
