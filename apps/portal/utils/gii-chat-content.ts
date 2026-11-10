import { GII_CHAT_MESSAGE_MAX_CHARS, GII_HISTORY_RECORDS_NOTE } from '@/constants/gii-conversation';
import type { GiiJobCaseLink } from '@/lib/crossub-api/gii-client';

/** Fit one message into the API's per-message cap, saying so when it was cut. */
export function truncateGiiChatContent(content: string): string {
  if (content.length <= GII_CHAT_MESSAGE_MAX_CHARS) return content;
  return `${content.slice(0, GII_CHAT_MESSAGE_MAX_CHARS - 40).trimEnd()}\n\n[…truncated]`;
}

/** A Cros reply as history: its text, then the records its cards linked, so a follow-up can act on them. */
export function giiAssistantHistoryContent(text: string, records: readonly GiiJobCaseLink[] | undefined): string {
  const labels = (records ?? []).map((r) => `${r.label} (${r.kind.replace('_', ' ')})`);
  if (labels.length === 0) return text;
  const note = GII_HISTORY_RECORDS_NOTE(labels);
  const room = GII_CHAT_MESSAGE_MAX_CHARS - note.length - 2;
  const body = text.length > room ? truncateGiiChatContent(text).slice(0, room) : text;
  return `${body}\n\n${note}`;
}
