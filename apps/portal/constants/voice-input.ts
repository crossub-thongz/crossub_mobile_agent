/**
 * Tap-to-talk tuning for Gii's mic button.
 *
 * Tap once to start listening, tap again to send. Holding the button was the earlier design
 * and it failed the way a hold always does on a desktop composer: a tap is what people
 * actually do, and a 200 ms hold gives a recogniser nothing to work with — so every attempt
 * came back "could not hear you clearly". A toggle also frees the agent to think mid-sentence
 * without their thumb committing them to a length.
 *
 * The session ends on its own after VOICE_SILENCE_TIMEOUT_MS of silence, so a forgotten mic
 * closes itself instead of listening to an empty room.
 */

/** Silence that ends the session and sends whatever was heard. */
export const VOICE_SILENCE_TIMEOUT_MS = 5_000;

/**
 * Ceiling on one dictation, in case the room is noisy enough that the silence watch never
 * trips. Long enough for any question an agent would actually dictate.
 */
export const VOICE_MAX_SESSION_MS = 120_000;

/**
 * How often the recorded stream is sampled for silence, and how loud it has to be to count as
 * speech. Byte time-domain samples sit at 128 for pure silence, so this is RMS *deviation*
 * from that midpoint: a quiet room reads 0–2, speech reads well into double figures.
 */
export const VOICE_SILENCE_SAMPLE_MS = 150;
export const VOICE_SPEECH_RMS_THRESHOLD = 3;

/**
 * RMS treated as a full-height meter. Conversational speech at a laptop mic sits around
 * 10–30, so this keeps the bars lively without pinning them at the ceiling.
 */
export const VOICE_LEVEL_FULL_SCALE_RMS = 24;

/** Phases of the mic button — never compare against raw strings. */
export const VOICE_PHASE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  /** Stopped, and waiting on the transcript. */
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
  LISTENING: 'Listening… tap the mic when you are done',
  WRAPPING: 'Got that — transcribing…',
} as const;

export const VOICE_BUTTON_ARIA_LABEL = {
  IDLE: 'Tap to speak',
  ACTIVE: 'Listening — tap to send',
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
  BUSY: 'Microphone is already listening — stop the other Gii mic first',
  UNSUPPORTED: 'Voice input is not supported in this browser — try Chrome',
  MIC_BLOCKED: 'Microphone access is blocked — allow mic permission and try again',
  RECORD_FAILED: 'Could not record audio — try again or type your question',
  NO_SPEECH: 'Could not hear you clearly — try again or type your question',
  TOO_SHORT: 'Could not hear you clearly — speak a little longer or type your question',
  /** Both paths are out: no server ASR on this environment and no recogniser in this browser. */
  NO_TRANSCRIBER: 'Voice input needs Chrome on this server — type your question for now',
  /** The browser recogniser could not reach its speech service (Chrome uses Google's). */
  ASR_UNREACHABLE:
    'Voice recognition could not be reached — check your connection or type your question',
  /** The meter never saw a sound: the browser is capturing from a dead or muted input. */
  MIC_SILENT:
    'No sound is reaching the microphone — check the input device your browser is using, or whether another app has the mic',
  /** Audio definitely arrived, but no transcriber made words out of it. */
  TRANSCRIBER_EMPTY:
    'Your mic is working, but nothing could be transcribed — try again or type your question',
  FAILED: 'Could not transcribe your voice — check your connection or type your question',
} as const;
