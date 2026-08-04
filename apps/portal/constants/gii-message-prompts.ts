/** Suggested prompts when Gii is scoped to a message thread. */
export const MESSAGE_GII_PROMPTS = [
  {
    id: 'summarize',
    label: 'Summarize message',
    prompt: 'Summarize this message thread and what action is needed.',
  },
  {
    id: 'draft-reply',
    label: 'Draft a reply',
    prompt: 'Draft a professional reply to the latest message in this thread.',
  },
  {
    id: 'next-steps',
    label: 'Next steps',
    prompt: 'What should I do next based on this message?',
  },
  {
    id: 'property-context',
    label: 'Property context',
    prompt: 'Give me relevant property status and any open cases for this address.',
  },
] as const;
