import { GII_CHAT_MESSAGE_MAX_CHARS } from '@/constants/gii-conversation';

/** Fit one message into the API's per-message cap, saying so when it was cut. */
export function truncateGiiChatContent(content: string): string {
  if (content.length <= GII_CHAT_MESSAGE_MAX_CHARS) return content;
  return `${content.slice(0, GII_CHAT_MESSAGE_MAX_CHARS - 40).trimEnd()}\n\n[…truncated]`;
}
