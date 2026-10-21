import { CONVERSATION_REPLY_DRAFT_KEY_PREFIX } from '@/constants/conversations';

/**
 * An unsent reply kept in this browser, per conversation. Attachments are not kept: base64 files
 * fill the ~5 MB storage quota. Every access is guarded, because storage can be missing (private
 * window) or full, and a draft is a convenience that must never take the composer down.
 */
export interface ConversationReplyDraft {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  text: string;
}

const draftKey = (conversationId: string) => `${CONVERSATION_REPLY_DRAFT_KEY_PREFIX}${conversationId}`;

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

const stringOf = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The saved draft, or null when there is none or storage cannot be read. */
export function readConversationReplyDraft(conversationId: string): ConversationReplyDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      to: stringArray(parsed.to),
      cc: stringArray(parsed.cc),
      bcc: stringArray(parsed.bcc),
      subject: stringOf(parsed.subject),
      html: stringOf(parsed.html),
      text: stringOf(parsed.text),
    };
  } catch {
    return null;
  }
}

/** Keep the draft. False when the browser refused the write (storage full or blocked). */
export function writeConversationReplyDraft(conversationId: string, draft: ConversationReplyDraft): boolean {
  try {
    localStorage.setItem(draftKey(conversationId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Drop the draft once the reply has gone. */
export function clearConversationReplyDraft(conversationId: string): void {
  try {
    localStorage.removeItem(draftKey(conversationId));
  } catch {
    // A draft left behind is overwritten by the next save and cleared by the next send.
  }
}
