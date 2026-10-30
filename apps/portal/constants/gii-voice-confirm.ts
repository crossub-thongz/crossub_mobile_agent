/**
 * Voice confirm in the Cros panel (Jarvis 4.3). After Cros reads a card back, a dictated "yes"
 * confirms it and a dictated "no" cancels it. A card whose `confirmBy` is screen (money and
 * legal steps) is never confirmed by voice; Cros says it needs a tap instead.
 */

export const GII_VOICE_ANSWER = {
  YES: 'yes',
  NO: 'no',
} as const;
export type GiiVoiceAnswer = (typeof GII_VOICE_ANSWER)[keyof typeof GII_VOICE_ANSWER];

/** The card's `confirmBy` values, as the API sends them. */
export const GII_CONFIRM_BY = {
  VOICE: 'voice',
  SCREEN: 'screen',
} as const;

/** Whole answers only: "yes, but change the date" is a new request, not a yes. */
export const GII_VOICE_YES = new Set([
  'yes',
  'yeah',
  'yep',
  'yes please',
  'confirm',
  'confirmed',
  'go ahead',
  'do it',
  'ok',
  'okay',
  'sure',
  'correct',
  "that's right",
  'that is right',
  '是',
  '好',
  '好的',
  '确认',
  '可以',
]);

export const GII_VOICE_NO = new Set([
  'no',
  'nope',
  'cancel',
  'cancel it',
  'stop',
  "don't",
  'do not',
  'no thanks',
  'no thank you',
  '不',
  '不要',
  '取消',
  '不用',
]);

export const GII_VOICE_CONFIRM_COPY = {
  SCREEN_ONLY: 'This one moves money or is a legal step, so it needs a tap on Confirm on your screen.',
} as const;
