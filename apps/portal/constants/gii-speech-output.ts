import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

/**
 * Cros's spoken replies (Jarvis 4.1). A question asked by voice is answered aloud with the
 * reply's `spoken` version; a typed one is not. The mute button silences it on this device.
 */

/** This device's mute choice; per device on purpose, since the car and the office differ. */
export const GII_SPEECH_MUTED_KEY = 'crossub-agent-cros-speech-muted';
export const GII_SPEECH_MUTED_VALUE = '1';

/** Voice languages to look for, best first. Australian English, then any English. */
export const GII_SPEECH_LANG_EN = ['en-AU', 'en-GB', 'en-US', 'en'] as const;
export const GII_SPEECH_LANG_ZH = ['zh-CN', 'zh-TW', 'zh-HK', 'zh'] as const;

/** A reply that is mostly 中文 is spoken with a Chinese voice. */
export const GII_SPEECH_CJK = /[㐀-鿿]/g;
export const GII_SPEECH_CJK_SHARE = 0.3;

/** A little quicker than the default, which sounds slow for short answers. */
export const GII_SPEECH_RATE = 1.05;

export const GII_SPEECH_COPY = {
  MUTE: `Mute ${CROS_ASSISTANT_NAME}'s voice`,
  UNMUTE: `Let ${CROS_ASSISTANT_NAME} speak`,
  MUTED_TOAST: `${CROS_ASSISTANT_NAME} won't read answers aloud on this device.`,
  UNMUTED_TOAST: `${CROS_ASSISTANT_NAME} reads aloud answers to questions you ask by voice.`,
} as const;

/**
 * Hands free (Jarvis 4.2): after Cros answers aloud the mic reopens by itself, so the agent can
 * keep talking with no taps until they say one of these, tap again, or go quiet.
 */
export const GII_HANDS_FREE_END = new Set([
  'stop',
  'stop listening',
  "that's all",
  'that is all',
  "that's it",
  'thanks',
  'thank you',
  'thanks cros',
  'thank you cros',
  'bye',
  'goodbye',
  'done',
  "i'm done",
  '结束',
  '谢谢',
  '再见',
  '好了',
]);

export const GII_HANDS_FREE_COPY = {
  START: `Talk with ${CROS_ASSISTANT_NAME} hands free`,
  STOP: 'Stop hands free',
  /** The words on the header button, so it is not a bare headphones icon. */
  BUTTON: 'Talk',
  BUTTON_ACTIVE: 'Stop',
  STARTED: `Hands free: ${CROS_ASSISTANT_NAME} answers aloud and listens again. Say "stop" to finish.`,
  ENDED: 'Okay, I will stop listening.',
  QUIET: `Hands free stopped: ${CROS_ASSISTANT_NAME} did not hear anything.`,
  NO_SPEECH: `This browser cannot read answers aloud, so hands free is not available.`,
} as const;
