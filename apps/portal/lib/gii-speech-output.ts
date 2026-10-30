import {
  GII_SPEECH_CJK,
  GII_SPEECH_CJK_SHARE,
  GII_SPEECH_LANG_EN,
  GII_SPEECH_LANG_ZH,
  GII_SPEECH_MUTED_KEY,
  GII_SPEECH_MUTED_VALUE,
  GII_SPEECH_RATE,
} from '@/constants/gii-speech-output';

/**
 * Reading Cros's answers aloud with the browser's own speech (Jarvis 4.1).
 *
 * `speechSynthesis` needs no key and works offline on iOS and Android. Safari only speaks after
 * a tap has started speech once, so `primeGiiSpeech` is called from the mic tap; a reply that
 * comes back seconds later can then be spoken. Everything here is silent on failure: a phone
 * that cannot speak still shows the answer.
 */

export function giiSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function readGiiSpeechMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GII_SPEECH_MUTED_KEY) === GII_SPEECH_MUTED_VALUE;
  } catch {
    return false;
  }
}

export function writeGiiSpeechMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (muted) window.localStorage.setItem(GII_SPEECH_MUTED_KEY, GII_SPEECH_MUTED_VALUE);
    else window.localStorage.removeItem(GII_SPEECH_MUTED_KEY);
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
}

/** The best installed voice for `text`: Chinese for a mostly 中文 reply, else Australian English first. */
function voiceFor(text: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const cjk = (text.match(GII_SPEECH_CJK) ?? []).length;
  const wanted = cjk / Math.max(text.length, 1) >= GII_SPEECH_CJK_SHARE ? GII_SPEECH_LANG_ZH : GII_SPEECH_LANG_EN;
  for (const lang of wanted) {
    const match =
      voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase() && v.localService) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (match) return match;
  }
  return null;
}

/** Start speech inside a tap, so Safari lets a later reply be spoken. */
export function primeGiiSpeech(): void {
  if (!giiSpeechSupported()) return;
  try {
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  } catch {
    // Nothing to prime on this browser.
  }
}

/** Stop anything Cros is saying. */
export function stopGiiSpeech(): void {
  if (!giiSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Already silent.
  }
}

/**
 * Say `text`, replacing anything still being said. `onEnd` runs once when it has been said, or
 * straight away when it cannot be (nothing to say, no speech here); never when stopped by
 * `stopGiiSpeech`, so a cancelled answer does not reopen the mic in hands free.
 */
export function speakGii(text: string, onEnd?: () => void): void {
  const said = text.trim();
  if (!said || !giiSpeechSupported()) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(said);
    const voice = voiceFor(said);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = GII_SPEECH_RATE;
    if (onEnd) {
      utterance.onend = () => onEnd();
      // "interrupted" and "canceled" are a stop, not an end.
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') onEnd();
      };
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // The answer is still on screen.
    onEnd?.();
  }
}
