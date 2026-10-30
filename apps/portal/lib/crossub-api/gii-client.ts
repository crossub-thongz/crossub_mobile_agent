import type { components } from '@crossub-thongz/api-contract';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { GII_PREFERENCES_COPY } from '@/constants/gii-preferences';
import type { GiiPageContext } from '@/utils/gii-page-context';

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

/** A record a Cros reply talked about, shown as an Open button under it. */
export type GiiJobCaseLink = components['schemas']['GiiJobCaseLinkDto'];
/** Cros's morning briefing, built on the server (Jarvis 2.2). */
export type GiiServerBriefing = components['schemas']['AgentGiiBriefingDto'];
export type GiiServerBriefingItem = components['schemas']['AgentGiiBriefingItemDto'];
export type GiiServerBriefingCategory = GiiServerBriefingItem['category'];

export type GiiChatResponse = components['schemas']['GiiChatResponseDto'];
export type GiiAssessment = components['schemas']['GiiAssessmentDto'];
/** A change Cros proposed and has not made — shown as a Confirm card. */
export type GiiProposal = components['schemas']['GiiProposalDto'];
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
 * instead of re-asking for the address. `page` names the screen the agent is on, and
 * `propertyChanged` says they navigated to another property since the last turn.
 * `earlierSummary` covers a long chat's turns that are no longer in `messages`.
 */
export async function sendGiiMessage(args: {
  messages: GiiChatMessage[];
  context?: GiiContext | null;
  page?: GiiPageContext | null;
  propertyChanged?: boolean;
  earlierSummary?: string | null;
}): Promise<GiiChatResponseWithPending> {
  const ctx = args.context;
  const hasSubject = Boolean(ctx?.propertyId) || (ctx?.pendingPropertyCandidates?.length ?? 0) > 0;
  const apiContext: components['schemas']['GiiChatContextDto'] | undefined =
    hasSubject || args.page || args.earlierSummary
      ? {
          ...(ctx?.propertyId ? { propertyId: ctx.propertyId } : {}),
          ...(ctx?.propertyLabel ? { propertyLabel: ctx.propertyLabel } : {}),
          ...(ctx?.moveOutDate ? { moveOutDate: ctx.moveOutDate } : {}),
          ...(ctx?.pendingPropertyCandidates?.length
            ? { pendingPropertyCandidates: ctx.pendingPropertyCandidates }
            : {}),
          ...(args.page ? { pageModule: args.page.pageModule, pageLabel: args.page.pageLabel } : {}),
          ...(args.page?.screenRecord ? { screenRecord: args.page.screenRecord } : {}),
          ...(args.propertyChanged ? { propertyChanged: true } : {}),
          ...(args.earlierSummary ? { earlierSummary: args.earlierSummary } : {}),
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

export type GiiConfirmResult = {
  done: boolean;
  message: string;
  /** `message` as Cros reads it aloud (Jarvis 4.1). */
  spoken: string;
  jobCases: GiiJobCaseLink[];
  /** Set when the change handed the chat to the CROSSUB team (Jarvis 2.3). */
  handoffThreadId: string | null;
};

/**
 * Confirm a Cros proposal: the server runs exactly the proposal behind `token`, for this
 * agent, if their permissions still allow it. A refusal the server explains (expired,
 * not permitted) comes back as `done: false` with its reason; only an unreachable server
 * throws.
 */
export async function confirmGiiProposal(token: string, byVoice = false): Promise<GiiConfirmResult> {
  const { data, error } = await crossub.POST('/agent/gii/confirm', {
    body: byVoice ? { token, byVoice } : { token },
  });
  if (data) {
    return {
      done: data.done,
      message: data.message,
      spoken: data.spoken,
      jobCases: data.jobCases,
      handoffThreadId: data.handoffThreadId,
    };
  }
  const reason = (error as { message?: unknown } | undefined)?.message;
  if (typeof reason === 'string' && reason.trim()) {
    return { done: false, message: reason, spoken: reason, jobCases: [], handoffThreadId: null };
  }
  throw new Error(`${CROS_ASSISTANT_NAME} could not confirm`);
}

/**
 * Fold a long chat's older lines into its notes: `summary` is the last one returned, if any,
 * and `messages` the lines after it, oldest first. Returns the notes for the whole chat so far.
 */
export async function summariseGiiConversation(body: {
  summary?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}): Promise<string> {
  const { data, error } = await crossub.POST('/agent/gii/summarise', { body });
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} could not summarise this chat`);
  return data.summary;
}

/** A saved Cros chat in the officer's list. */
export type GiiConversationSummary = components['schemas']['GiiConversationSummaryDto'];
export type GiiConversation = components['schemas']['GiiConversationDto'];
export type GiiConversationSave = components['schemas']['GiiConversationSaveDto'];

/** The officer's saved chats, newest first. Only their own; the server keeps the latest 50. */
export async function listGiiConversations(): Promise<GiiConversationSummary[]> {
  const { data, error } = await crossub.GET('/agent/gii/conversations');
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} chats could not be loaded`);
  return data;
}

export async function getGiiConversation(id: string): Promise<GiiConversation> {
  const { data, error } = await crossub.GET('/agent/gii/conversations/{id}', {
    params: { path: { id } },
  });
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} chat could not be opened`);
  return data;
}

/** Save the whole transcript under `id` (minted by the app); replaces what was saved before. */
export async function saveGiiConversation(
  id: string,
  body: GiiConversationSave,
): Promise<GiiConversationSummary> {
  const { data, error } = await crossub.PUT('/agent/gii/conversations/{id}', {
    params: { path: { id } },
    body,
  });
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} chat could not be saved`);
  return data;
}

/** A change Cros made on a property after an officer pressed Confirm. */
export type GiiChange = components['schemas']['GiiChangeDto'];

/** Cros's confirmed changes on a property, newest first (the AI decision log). */
export async function listGiiChanges(propertyId: string): Promise<GiiChange[]> {
  const { data, error } = await crossub.GET('/agent/gii/changes', {
    params: { query: { propertyId } },
  });
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} changes could not be loaded`);
  return data.changes;
}

/** Today's briefing for the signed-in agent; the server builds it on the first read of the day. */
export async function getGiiBriefing(): Promise<GiiServerBriefing> {
  const { data, error } = await crossub.GET('/agent/gii/briefing');
  if (error || !data) throw new Error(`${CROS_ASSISTANT_NAME} briefing could not be loaded`);
  return data;
}

/** The agent saw the briefing: tomorrow's "since your last briefing" counts from now. */
export async function markGiiBriefingSeen(briefingDate: string): Promise<void> {
  const { error, response } = await crossub.POST('/agent/gii/briefing/seen', { body: { briefingDate } });
  if (error || !response.ok) throw new Error(`${CROS_ASSISTANT_NAME} briefing could not be marked seen`);
}

/** A Cros chat a CROSSUB person holds (Jarvis 2.3): their replies, the wait, the team's hours. */
export type GiiHandoff = components['schemas']['AgentGiiHandoffDto'];
export type GiiHandoffMessage = components['schemas']['AgentGiiHandoffMessageDto'];

/** The agent's open chat with the CROSSUB team, or null when none is with them. */
export async function getCurrentGiiHandoff(): Promise<GiiHandoff | null> {
  const { data, error } = await crossub.GET('/agent/gii/handoff');
  if (error || !data) throw new Error('The CROSSUB team chat could not be loaded');
  return data.handoff;
}

/** One handed-over chat, open or closed. */
export async function getGiiHandoff(threadId: string): Promise<GiiHandoff> {
  const { data, error } = await crossub.GET('/agent/gii/handoff/{threadId}', {
    params: { path: { threadId } },
  });
  if (error || !data) throw new Error('The CROSSUB team chat could not be loaded');
  return data;
}

/** Write to the CROSSUB team while they hold the chat. */
export async function sendGiiHandoffMessage(threadId: string, body: string): Promise<GiiHandoff> {
  const { data, error } = await crossub.POST('/agent/gii/handoff/{threadId}/messages', {
    params: { path: { threadId } },
    body: { body },
  });
  if (error || !data) throw new Error('Your message could not be sent to the CROSSUB team');
  return data;
}

export async function deleteGiiConversation(id: string): Promise<void> {
  const { error, response } = await crossub.DELETE('/agent/gii/conversations/{id}', {
    params: { path: { id } },
  });
  if (error || !response.ok) throw new Error(`${CROS_ASSISTANT_NAME} chat could not be deleted`);
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

/** The agent's Cros preferences (Jarvis 3.2): email tone, sign off and quiet hours. */
export type GiiPreferences = components['schemas']['AgentGiiPreferencesDto'];
export type GiiPreferencesChange = components['schemas']['UpdateAgentGiiPreferencesDto'];

export async function getGiiPreferences(): Promise<GiiPreferences> {
  const { data, error } = await crossub.GET('/agent/gii/preferences');
  if (error || !data) throw new Error(GII_PREFERENCES_COPY.LOAD_FAILED);
  return data;
}

/** Save a change; the server's reason comes back as the error when it refuses one. */
export async function updateGiiPreferences(change: GiiPreferencesChange): Promise<GiiPreferences> {
  const { data, error } = await crossub.PUT('/agent/gii/preferences', { body: change });
  if (error || !data) {
    const reason = (error as { message?: unknown } | undefined)?.message;
    throw new Error(typeof reason === 'string' && reason ? reason : GII_PREFERENCES_COPY.SAVE_FAILED);
  }
  return data;
}
