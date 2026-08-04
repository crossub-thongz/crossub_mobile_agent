import { BROWSER_ASR_SETTLE_MS } from '@/constants/voice-input';

/**
 * The browser's own speech recogniser (Chrome/Edge `SpeechRecognition`), used as Gii's
 * fallback transcriber.
 *
 * Server ASR is the primary path — see `gii-voice-input.ts`. This exists because the server
 * only transcribes on environments that carry an ASR key, and "no key on this deploy" must
 * not read to an agent as a broken mic. It is deliberately silent: every failure here is
 * absorbed and surfaces as an empty transcript, so the caller decides what the agent is told.
 *
 * Chrome ends a recognition session on its own after a pause, so a hold that spans a pause
 * needs a fresh instance each time — hence the restart loop rather than one long session.
 */

export type GiiBrowserSpeech = {
  /** Everything finalised so far. */
  transcript: () => string;
  /** Stop listening and resolve with the settled transcript. Safe to call twice. */
  stop: () => Promise<string>;
  /** Drop the session and the transcript. */
  abort: () => void;
};

export function browserSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startBrowserSpeech(options: {
  lang: string;
  /** Live text while the agent is still speaking — final + interim. */
  onInterim?: (text: string) => void;
}): GiiBrowserSpeech | null {
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;

  let recognition: SpeechRecognition | null = null;
  let listening = true;
  let stopped = false;
  /** Finalised text from passes that have already ended. */
  let committedText = '';
  /** Finalised text from the pass currently running. */
  let passText = '';
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let settle: ((text: string) => void) | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  const detach = (rec: SpeechRecognition) => {
    rec.onstart = null;
    rec.onend = null;
    rec.onerror = null;
    rec.onresult = null;
    try {
      rec.abort();
    } catch {
      // Already finished — nothing to unwind.
    }
  };

  const captured = (): string => `${committedText}${passText}`.trim();

  /** Fold the finished pass into the running transcript. */
  const commitPass = () => {
    committedText += passText;
    passText = '';
  };

  /** Hand the transcript to a pending `stop()` exactly once. */
  const resolveSettled = () => {
    if (!settle) return;
    const done = settle;
    settle = null;
    clearTimers();
    if (recognition) {
      detach(recognition);
      recognition = null;
    }
    commitPass();
    done(captured());
  };

  const scheduleRestart = (delayMs: number) => {
    if (!listening || restartTimer) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      beginPass();
    }, delayMs);
  };

  const beginPass = () => {
    if (!listening) return;
    if (recognition) {
      detach(recognition);
      recognition = null;
    }

    const rec = new Ctor();
    recognition = rec;
    passText = '';
    rec.lang = options.lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // `results` carries every result of THIS pass, so rebuilding from index 0 each time keeps
    // the transcript correct without depending on the non-standard `resultIndex`.
    rec.onresult = (event) => {
      let settled = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i]?.[0]?.transcript ?? '';
        if (event.results[i]?.isFinal) settled += piece;
        else interim += piece;
      }
      passText = settled;
      options.onInterim?.(`${committedText}${settled}${interim}`.trim());
    };

    rec.onerror = (event) => {
      if (event.error === 'aborted') return;
      // `network` and `no-speech` are routine mid-hold; anything else ends this pass too.
      if (recognition === rec) {
        detach(rec);
        recognition = null;
      }
      if (listening) {
        commitPass();
        scheduleRestart(event.error === 'network' ? 320 : 180);
        return;
      }
      resolveSettled();
    };

    rec.onend = () => {
      if (recognition === rec) recognition = null;
      if (listening) {
        commitPass();
        scheduleRestart(220);
        return;
      }
      resolveSettled();
    };

    try {
      rec.start();
    } catch {
      // Chrome throws when a previous instance has not released the mic yet.
      if (recognition === rec) recognition = null;
      scheduleRestart(220);
    }
  };

  beginPass();

  return {
    transcript: captured,
    stop: () => {
      if (stopped) return Promise.resolve(captured());
      stopped = true;
      listening = false;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      if (!recognition) {
        commitPass();
        return Promise.resolve(captured());
      }

      return new Promise<string>((resolve) => {
        settle = resolve;
        // `stop()` flushes the pending utterance through onresult/onend; the timer is the
        // ceiling so a recogniser that never fires onend cannot stall the composer.
        settleTimer = setTimeout(resolveSettled, BROWSER_ASR_SETTLE_MS);
        try {
          recognition?.stop();
        } catch {
          resolveSettled();
        }
      });
    },
    abort: () => {
      stopped = true;
      listening = false;
      committedText = '';
      passText = '';
      settle = null;
      clearTimers();
      if (recognition) {
        detach(recognition);
        recognition = null;
      }
    },
  };
}
