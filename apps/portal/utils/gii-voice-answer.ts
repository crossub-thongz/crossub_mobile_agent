import { GII_HANDS_FREE_END } from '@/constants/gii-speech-output';
import {
  GII_VOICE_ANSWER,
  GII_VOICE_NO,
  GII_VOICE_YES,
  type GiiVoiceAnswer,
} from '@/constants/gii-voice-confirm';

/** A dictated line as the short answers are listed: lower case, no punctuation. */
function normalised(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.,!?。，！？]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A dictated reply to a Confirm card as yes, no, or null when it is anything else. */
export function giiVoiceAnswer(text: string): GiiVoiceAnswer | null {
  const said = normalised(text);
  if (GII_VOICE_YES.has(said)) return GII_VOICE_ANSWER.YES;
  if (GII_VOICE_NO.has(said)) return GII_VOICE_ANSWER.NO;
  return null;
}

/** Whether a dictated line ends hands free ("stop", "that's all", "thanks Cros"). */
export function giiHandsFreeEnds(text: string): boolean {
  return GII_HANDS_FREE_END.has(normalised(text));
}
