import { agentFetch } from '@/lib/crossub-api/agent-client';

import {
  TERMINATION_REQUEST_JURISDICTION,
  type TerminationReasonOption,
} from '@/lib/termination-request/constants';

/**
 * These two routes are on the API's agent facade but not yet in the published mobile
 * contract, so the shapes below are written by hand. They match
 * `crossub_web/apps/api/src/modules/termination-requests` — keep them in step until the
 * contract carries them.
 */

/** Body of `POST /agent/properties/:propertyId/termination-requests`. The API rejects any other field. */
export type CreateAgentTerminationRequestInput = {
  reasonCode: string;
  jurisdictionCode?: string;
};

/** The part of the API's `TerminationRequestView` the agent app reads back. */
export type AgentTerminationRequest = {
  id: string;
  propertyId: string;
  reasonCode: string;
  reasonTitle: string;
  status: string;
  notifiedAccountManager: boolean;
};

/** `GET /agent/termination-reasons`. Throws when the API refuses or is unreachable. */
export async function fetchTerminationReasons(
  jurisdictionCode: string = TERMINATION_REQUEST_JURISDICTION,
): Promise<TerminationReasonOption[]> {
  const data = await agentFetch<{
    jurisdictionCode: string;
    reasons: TerminationReasonOption[];
  }>(`/agent/termination-reasons?jurisdictionCode=${encodeURIComponent(jurisdictionCode)}`);
  return data.reasons
    .map((reason) => ({ code: reason.code.trim(), title: reason.title.trim() }))
    .filter((reason) => reason.code && reason.title);
}

/**
 * Lodge a record-only termination request. The API stamps the source, the assigned
 * account manager and the primary tenant itself; none of them is sent from here.
 */
export async function createAgentTerminationRequest(
  propertyId: string,
  input: CreateAgentTerminationRequestInput,
): Promise<AgentTerminationRequest> {
  const data = await agentFetch<{ request: AgentTerminationRequest }>(
    `/agent/properties/${encodeURIComponent(propertyId)}/termination-requests`,
    {
      method: 'POST',
      body: JSON.stringify({
        reasonCode: input.reasonCode,
        jurisdictionCode: input.jurisdictionCode ?? TERMINATION_REQUEST_JURISDICTION,
      }),
    },
  );
  return data.request;
}
