import type { components } from '@crossub-thongz/api-contract';

import { crossub } from './client';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/v1`;

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
  propertyLabel?: string;
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
  const apiContext = args.context?.propertyId
    ? {
        propertyId: args.context.propertyId,
        ...(args.context.moveOutDate ? { moveOutDate: args.context.moveOutDate } : {}),
      }
    : undefined;

  const { data, error } = await crossub.POST('/agent/gii/chat', {
    body: {
      messages: args.messages,
      ...(apiContext ? { context: apiContext } : {}),
    } as components['schemas']['GiiChatRequestDto'] & {
      messages: GiiChatMessage[];
    },
  });
  if (error || !data) throw new Error('Gii is unavailable');
  return data;
}

/** Hold-to-talk audio → text via the server ASR (shows in Network tab; works when Web Speech is blocked). */
export async function transcribeGiiVoice(args: {
  audioBase64: string;
  mediaType: string;
  languageHint?: string;
}): Promise<{ text: string; provider?: string }> {
  const res = await fetch(`${API_BASE}/agent/gii/transcribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = new Error('Transcription failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<{ text: string; provider?: string }>;
}
