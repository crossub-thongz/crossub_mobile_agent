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
