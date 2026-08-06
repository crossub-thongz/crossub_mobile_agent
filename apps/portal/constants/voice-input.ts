import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

/** Tap-to-talk tuning for the assistant mic button. */
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

/**
 * Silence that ends the session and sends whatever was heard.
 *
 * Two seconds: this window is dead time on every dictation — nothing is uploaded until it
 * elapses — so it was the bulk of the wait between finishing a sentence and seeing the
 * transcript. Short enough to feel immediate, long enough to survive the pause someone takes
 * mid-thought. Tapping the mic still sends instantly and skips it entirely.
 */
export const VOICE_SILENCE_TIMEOUT_MS = 2_000;

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
/**
 * Low on purpose. It decides two things — when to stop on silence, and whether to tell
 * someone their mic is dead — and being too high is costly in both directions: it cuts off a
 * softly-spoken agent, and it calls a quiet-but-working input broken. A quiet room still
 * reads under 1.
 */
export const VOICE_SPEECH_RMS_THRESHOLD = 1.5;

/**
 * Capture constraints for the recording stream.
 *
 * Chrome's processing chain is on by default, and on some setups — virtual devices,
 * conferencing drivers, certain headsets — `echoCancellation` is enough to hand back a
 * stream of pure silence. ASR also prefers the raw signal to a gated, gain-ridden one, so
 * turning all three off is both the fix and the better input.
 */
export const VOICE_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

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
  { heightPx: 10, delayMs: 0, weight: 0.8 },
  { heightPx: 18, delayMs: 120, weight: 1.15 },
  { heightPx: 22, delayMs: 240, weight: 1 },
  { heightPx: 13, delayMs: 360, weight: 0.65 },
] as const;

/**
 * Resting scale of a bar at silence, and how hard the measured level pushes it. `weight`
 * above spreads the same level across the bars so it still reads as a waveform rather than
 * four bars moving as one block.
 */
export const VOICE_WAVE_REST_SCALE = 0.3;
export const VOICE_WAVE_LEVEL_GAIN = 1.4;

/** Status line above the composer. */
export const VOICE_STATUS_LABEL = {
  LISTENING: 'Listening… tap the mic when you are done',
  WRAPPING: 'Got that — transcribing…',
} as const;

export const VOICE_BUTTON_ARIA_LABEL = {
  IDLE: 'Tap to speak',
  ACTIVE: 'Listening — tap to send',
  WRAPPING: 'Transcribing what you said',
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
  BUSY: `Microphone is already listening — stop the other ${CROS_ASSISTANT_NAME} mic first`,
  UNSUPPORTED: 'Voice input is not supported in this browser — try Chrome',
  MIC_BLOCKED: 'Microphone access is blocked — allow mic permission and try again',
  RECORD_FAILED: 'Could not record audio — try again or type your question',
  NO_SPEECH: 'Could not hear you clearly — try again or type your question',
  TOO_SHORT: 'Could not hear you clearly — speak a little longer or type your question',
  /**
   * The server told us it has no ASR. Says so plainly rather than blaming the browser: where
   * the browser recogniser is blocked, this key is the only thing that makes voice work, and
   * an agent reading "try Chrome" would go round that loop forever.
   */
  NO_TRANSCRIBER: 'Voice transcription is not set up on this server — type your question for now',
  /** The browser recogniser could not reach its speech service (Chrome uses Google's). */
  ASR_UNREACHABLE:
    'Voice recognition could not be reached — check your connection or type your question',
  /** The meter never saw a sound: the browser is capturing from a dead or muted input. */
  MIC_SILENT:
    'No sound is reaching the microphone — check the input device your browser is using, or whether another app has the mic',
  /** Fallback when the device has no label (permission granted but nothing to name). */
  MIC_SILENT_UNNAMED_DEVICE: 'the default input',
  /** Audio definitely arrived, but no transcriber made words out of it. */
  TRANSCRIBER_EMPTY:
    'Your mic is working, but nothing could be transcribed — try again or type your question',
  FAILED: 'Could not transcribe your voice — check your connection or type your question',
} as const;

/**
 * Naming the device is the whole diagnosis. "No sound is reaching the microphone" leaves
 * someone hunting; "Chrome is listening to *Aggregate Device*" tells them in one read that
 * the browser picked the wrong input, which is the usual cause.
 */
export function micSilentMessage(deviceLabel?: string | null): string {
  const device = deviceLabel?.trim() || VOICE_ERROR.MIC_SILENT_UNNAMED_DEVICE;
  return `No sound is reaching the microphone — your browser is listening to “${device}”. Pick a different input in Chrome's site settings, or check whether another app has the mic.`;
}
