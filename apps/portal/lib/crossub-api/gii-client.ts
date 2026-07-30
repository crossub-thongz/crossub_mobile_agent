import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './client';

/**
 * Gii — the AI assistant, over the typed mobile contract.
 *
 * Every figure Gii states comes from the server's deterministic vacate engine, never from
 * the model: `assessment` is the engine's own output, so render it as given rather than
 * recomputing or re-rounding anything (notably `dailyRentDisplay`).
 */

export type GiiChatMessage = components['schemas']['GiiChatMessageDto'] & {
  attachments?: GiiChatAttachment[];
};
export type GiiChatResponse = components['schemas']['GiiChatResponseDto'];
export type GiiAssessment = components['schemas']['GiiAssessmentDto'];
export type GiiTermProgress = components['schemas']['GiiTermProgressDto'];
export type GiiBreakFee = components['schemas']['GiiBreakFeeDto'];
export type GiiNotice = components['schemas']['GiiNoticeDto'];
export type GiiRentOwed = components['schemas']['GiiRentOwedDto'];

/** PDF/image payload for one Gii turn — only on the latest user message. */
export type GiiChatAttachment = {
  fileName: string;
  mediaType: string;
  base64: string;
};

/** The subject carried between turns — Gii is stateless and tool results do not persist. */
export interface GiiContext {
  propertyId?: string;
  moveOutDate?: string;
}

/**
 * Send a turn. The whole transcript is resent each time; `context` echoes the previous
 * assessment's property so Gii keeps the subject instead of re-asking for the address.
 */
export async function sendGiiMessage(args: {
  messages: GiiChatMessage[];
  context?: GiiContext | null;
}): Promise<GiiChatResponse> {
  const { data, error } = await crossub.POST('/agent/gii/chat', {
    body: {
      messages: args.messages,
      ...(args.context?.propertyId ? { context: args.context } : {}),
    } as components['schemas']['GiiChatRequestDto'] & {
      messages: GiiChatMessage[];
    },
  });
  if (error || !data) throw new Error('Gii is unavailable');
  return data;
}
