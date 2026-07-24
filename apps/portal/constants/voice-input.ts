/**
 * Push-to-talk tuning for Gii's mic button.
 *
 * Web Speech closes the utterance the moment `stop()` is called, so releasing the button
 * mid-word truncates the transcript — the last word simply never arrives. We hold the
 * recogniser open for a short buffer after release: long enough to catch a trailing word,
 * short enough that the button still feels like it responded to the release.
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
  WRAPPING: 'Got that — finishing up…',
} as const;

export const VOICE_BUTTON_ARIA_LABEL = {
  IDLE: 'Hold to speak',
  ACTIVE: 'Listening — release to send',
} as const;
