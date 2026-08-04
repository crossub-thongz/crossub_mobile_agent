/**
 * Push-to-talk tuning for Gii's mic button.
 *
 * Web Speech closes the utterance the moment `stop()` is called, so releasing the button
 * mid-word truncates the transcript — the last word simply never arrives. We hold the
 * recogniser open for a short buffer after release: long enough to catch a trailing word,
 * short enough that the button still feels like it responded to the release.
 *
 * While the button is held, audio is recorded locally then sent to the server for
 * transcription (Deepgram/Whisper) — visible in DevTools and reliable unlike Web Speech.
 */
export const VOICE_STOP_BUFFER_MS = 500;

/** Phases of the mic button — never compare against raw strings. */
export const VOICE_PHASE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  /** Released, but the recogniser stays open for VOICE_STOP_BUFFER_MS. */
  WRAPPING: 'wrapping',
} as const;

export type VoicePhase = (typeof VOICE_PHASE)[keyof typeof VOICE_PHASE];

/**
 * The animated waveform shown in place of the mic while listening. Uneven resting heights
 * plus a per-bar delay read as speech rather than as a metronome.
 */
export const VOICE_WAVE_BARS = [
  { heightPx: 10, delayMs: 0 },
  { heightPx: 18, delayMs: 120 },
  { heightPx: 22, delayMs: 240 },
  { heightPx: 13, delayMs: 360 },
] as const;

/** Status line above the composer. */
export const VOICE_STATUS_LABEL = {
  LISTENING: 'Listening… release when done',
  WRAPPING: 'Got that — transcribing…',
} as const;

export const VOICE_BUTTON_ARIA_LABEL = {
  IDLE: 'Hold to speak',
  ACTIVE: 'Listening — release to send',
} as const;

/**
 * How long we wait for the browser recogniser to settle after `stop()` before taking whatever
 * it has. Chrome usually fires `onend` within a few hundred ms; this is the ceiling so a mic
 * press can never hang the composer.
 */
export const BROWSER_ASR_SETTLE_MS = 1_500;

/** Smallest recording worth uploading — anything less is a mis-tap, not speech. */
export const VOICE_MIN_CLIP_BYTES = 800;

/** Everything the mic can tell the agent. Kept here so the wording stays consistent. */
export const VOICE_ERROR = {
  BUSY: 'Microphone is already active — release the other Gii mic first',
  UNSUPPORTED: 'Voice input is not supported in this browser — try Chrome',
  MIC_BLOCKED: 'Microphone access is blocked — allow mic permission and try again',
  RECORD_FAILED: 'Could not record audio — try again or type your question',
  NO_SPEECH: 'Could not hear you clearly — try again or type your question',
  TOO_SHORT: 'Could not hear you clearly — hold the mic a little longer or type your question',
  /** Both paths are out: no server ASR on this environment and no recogniser in this browser. */
  NO_TRANSCRIBER:
    'Voice input needs Chrome on this server — type your question for now',
  FAILED: 'Could not transcribe your voice — check your connection or type your question',
} as const;
