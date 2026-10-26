import {
  GII_CONVERSATION_MAX_MESSAGES,
  GII_CONVERSATION_MESSAGE_MAX_CHARS,
  GII_CONVERSATION_TITLE_MAX_CHARS,
  GII_PENDING_TEXT,
} from '@/constants/gii-conversation';

export type GiiTranscriptLine = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
};

export type GiiConversationSaveInput = {
  title: string;
  messages: { role: 'user' | 'assistant'; text: string }[];
  /** Changes whenever the saved transcript would; equal keys need no second save. */
  key: string;
};

/**
 * What to save for a chat, or null while a turn is in flight or nothing has been asked.
 * Only words are saved: cards, attachments and proposals belong to the turn they came on.
 */
export function giiConversationSaveInput(lines: GiiTranscriptLine[]): GiiConversationSaveInput | null {
  if (lines.some((line) => line.pending)) return null;
  const settled = lines.filter((line) => line.text.trim() && line.text !== GII_PENDING_TEXT);
  const firstUser = settled.find((line) => line.role === 'user');
  if (!firstUser) return null;
  const kept = settled.slice(-GII_CONVERSATION_MAX_MESSAGES);
  const last = kept[kept.length - 1];
  return {
    title: firstUser.text.trim().slice(0, GII_CONVERSATION_TITLE_MAX_CHARS),
    messages: kept.map((line) => ({
      role: line.role,
      text: line.text.slice(0, GII_CONVERSATION_MESSAGE_MAX_CHARS),
    })),
    key: `${settled.length}:${last.id}:${last.text.length}`,
  };
}

/** A reopened chat's lines. Saved messages carry no ids, so they are numbered under the chat. */
export function giiConversationLines(
  chatId: string,
  messages: { role: 'user' | 'assistant'; text: string }[],
): GiiTranscriptLine[] {
  return messages.map((message, index) => ({
    id: `${chatId}:${index}`,
    role: message.role,
    text: message.text,
  }));
}
