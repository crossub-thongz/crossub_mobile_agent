/** Saved Cros chats (Jarvis 1.2). Limits mirror the API's `GiiConversationSaveDto`. */
export const GII_CONVERSATION_TITLE_MAX_CHARS = 120;
export const GII_CONVERSATION_MAX_MESSAGES = 200;
export const GII_CONVERSATION_MESSAGE_MAX_CHARS = 20000;

/** The placeholder an assistant line shows while its turn is in flight. Never saved. */
export const GII_PENDING_TEXT = 'Thinking…';

export const GII_CONVERSATION_COPY = {
  EMPTY: 'Your conversations appear here, on any device you sign in on.',
  SAVE_FAILED: 'This chat could not be saved. It stays open here.',
  OPEN_FAILED: 'That chat could not be opened.',
  DELETE: 'Delete',
  DELETE_FAILED: 'That chat could not be deleted.',
} as const;

/** One toast id, so a run of failed saves shows a single message. */
export const GII_CONVERSATION_SAVE_TOAST_ID = 'gii-conversation-save';

/** Messages the chat API takes per turn (`GII_MAX_HISTORY_MESSAGES`), context seed included. */
export const GII_CHAT_MAX_MESSAGES = 20;

/** `GiiChatMessageDto.content` @MaxLength. */
export const GII_CHAT_MESSAGE_MAX_CHARS = 4000;

/**
 * Long chats (Jarvis 1.2): once more than `FOLD_AT` lines follow the summary, all but the
 * last `KEEP_RECENT` are folded into it. Folding at 16 leaves room in the 20 for the
 * context seed and the next question; keeping 8 means a fold every four turns, not every one.
 */
export const GII_SUMMARY_FOLD_AT = 16;
export const GII_SUMMARY_KEEP_RECENT = 8;

/** Most lines one summarise request takes (`GII_SUMMARISE_MAX_MESSAGES`). */
export const GII_SUMMARISE_MAX_MESSAGES = 40;
