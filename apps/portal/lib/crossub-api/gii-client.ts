import type { components } from '@crossub-thongz/api-contract';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';

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

/** Job-case Open buttons — present once the API contract ships `jobCases` on chat. */
export type GiiJobCaseLink = {
  id: string;
  kind: 'maintenance' | 'rent_review' | 'inspection';
  reference: string | null;
  label: string;
};

export type GiiChatResponse = components['schemas']['GiiChatResponseDto'] & {
  jobCases?: GiiJobCaseLink[];
};
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

/** One candidate from an ambiguous find_property — echo so "1" / "1A" can resolve. */
export type GiiPendingPropertyCandidate = {
  propertyId: string;
  label: string;
  tenantName?: string | null;
};

/** The subject carried between turns — Gii is stateless and tool results do not persist. */
export interface GiiContext {
  propertyId?: string;
  propertyLabel?: string;
  moveOutDate?: string;
  pendingPropertyCandidates?: GiiPendingPropertyCandidate[];
}

export type GiiChatResponseWithPending = GiiChatResponse & {
  pendingPropertyCandidates?: GiiPendingPropertyCandidate[];
};

/**
 * Send a turn. The whole transcript is resent each time; `context` echoes the previous
 * assessment's property (and any pending ambiguous candidates) so Gii keeps the subject
 * instead of re-asking for the address.
 */
export async function sendGiiMessage(args: {
  messages: GiiChatMessage[];
  context?: GiiContext | null;
}): Promise<GiiChatResponseWithPending> {
  const ctx = args.context;
  const apiContext =
    ctx?.propertyId || (ctx?.pendingPropertyCandidates?.length ?? 0) > 0
      ? {
          ...(ctx?.propertyId ? { propertyId: ctx.propertyId } : {}),
          ...(ctx?.propertyLabel ? { propertyLabel: ctx.propertyLabel } : {}),
          ...(ctx?.moveOutDate ? { moveOutDate: ctx.moveOutDate } : {}),
          ...(ctx?.pendingPropertyCandidates?.length
            ? { pendingPropertyCandidates: ctx.pendingPropertyCandidates }
            : {}),
        }
      : undefined;

  const { data, error } = await crossub.POST('/agent/gii/chat', {
    body: {
      messages: args.messages,
      ...(apiContext ? { context: apiContext } : {}),
    } as components['schemas']['GiiChatRequestDto'] & {
      messages: GiiChatMessage[];
      context?: Record<string, unknown>;
    },
  });
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} is unavailable`);
  return data as GiiChatResponseWithPending;
}

/**
 * Can this environment transcribe hold-to-talk audio?
 *
 * Asked before recording, because server ASR and the browser recogniser capture differently
 * and there is no second chance once the agent has spoken.
 *
 * `available: null` means **unknown**, and a 404 is exactly that — not "no". The probe is
 * newer than `POST /transcribe`, so an API that predates it can still transcribe perfectly
 * well; reading its 404 as a refusal would send the app to the browser recogniser and never
 * even try the endpoint that works. Only the server's own `false` is a real no.
 */
export async function fetchGiiVoiceStatus(): Promise<{
  available: boolean | null;
  provider?: string | null;
}> {
  const res = await fetch(`${API_BASE}/agent/gii/voice-status`, {
    credentials: 'include',
  });
  if (!res.ok) return { available: null };
  return res.json() as Promise<{ available: boolean; provider?: string | null }>;
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
