import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

/** Cros preferences (Jarvis 3.2): the tones the server accepts, in the order Settings shows them. */
export const GII_TONE = {
  FRIENDLY: 'friendly',
  FORMAL: 'formal',
  BRIEF: 'brief',
} as const;

export type GiiTone = (typeof GII_TONE)[keyof typeof GII_TONE];

export const GII_TONE_OPTIONS: readonly { value: GiiTone; label: string; hint: string }[] = [
  { value: GII_TONE.FRIENDLY, label: 'Friendly', hint: 'Warm and plain' },
  { value: GII_TONE.FORMAL, label: 'Formal', hint: 'Courteous, full names' },
  { value: GII_TONE.BRIEF, label: 'Brief', hint: 'Only what is needed' },
];

/** Longest sign off the server keeps. */
export const GII_SIGN_OFF_MAX_CHARS = 200;

/** Quiet hours offered when the agent first turns them on. */
export const GII_QUIET_DEFAULT = { START: '22:00', END: '07:00' } as const;

export const GII_PREFERENCES_COPY = {
  HEADING: CROS_ASSISTANT_NAME,
  TONE_LABEL: 'Email tone',
  TONE_DESCRIPTION: `How the emails ${CROS_ASSISTANT_NAME} drafts for you read.`,
  SIGN_OFF_LABEL: 'Sign off',
  SIGN_OFF_DESCRIPTION: "Your own sign off on every email. Your agency's name still closes each one. Leave empty to sign as the agency.",
  SIGN_OFF_PLACEHOLDER: 'Kind regards,\nYour name',
  QUIET_LABEL: 'Quiet hours',
  QUIET_DESCRIPTION: `No phone alerts from ${CROS_ASSISTANT_NAME} in these hours, Sydney time. The bell still shows them.`,
  QUIET_FROM: 'From',
  QUIET_TO: 'To',
  CONTRACTORS_LABEL: 'Preferred contractors',
  CONTRACTORS_DESCRIPTION: `${CROS_ASSISTANT_NAME} uses your agency's suppliers from People.`,
  CONTRACTORS_LINK: 'Open People →',
  SAVE: 'Save',
  SAVING: 'Saving…',
  SAVED: `${CROS_ASSISTANT_NAME} preferences saved`,
  LOAD_FAILED: `${CROS_ASSISTANT_NAME} preferences could not be loaded`,
  SAVE_FAILED: `${CROS_ASSISTANT_NAME} preferences could not be saved`,
} as const;
