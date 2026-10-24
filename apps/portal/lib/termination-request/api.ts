import { agentFetch } from '@/lib/crossub-api/agent-client';

import {
  NSW_TERMINATION_REASONS,
  TERMINATION_REQUEST_JURISDICTION,
  TERMINATION_REQUEST_SOURCE_AGENT,
  type TerminationReasonOption,
} from '@/lib/termination-request/constants';

export type CreateAgentTerminationRequestInput = {
  reasonCode: string;
  jurisdictionCode?: string;
  tenantReferenceId: string;
  tenantName: string;
};

export type AgentTerminationRequestResult = {
  id: string;
  status: string;
};

/**
 * Reasons for one jurisdiction. Falls back to the active AU-NSW list when the
 * Reason API is not published yet. Other jurisdictions stay empty until the API
 * returns them — the form never offers a country or state picker.
 */
export async function fetchTerminationReasons(
  jurisdictionCode: string = TERMINATION_REQUEST_JURISDICTION,
): Promise<TerminationReasonOption[]> {
  try {
    const data = await agentFetch<{
      reasons?: Array<{ code?: string | null; label?: string | null }>;
    }>(
      `/agent/termination-reasons?jurisdictionCode=${encodeURIComponent(jurisdictionCode)}`,
    );
    const reasons = (data.reasons ?? [])
      .map((reason) => ({
        code: reason.code?.trim() ?? '',
        label: reason.label?.trim() ?? '',
      }))
      .filter((reason) => reason.code && reason.label);
    if (reasons.length > 0) return reasons;
  } catch {
    // The route lands with the admin module. AU-NSW is the only active list.
  }
  if (jurisdictionCode === TERMINATION_REQUEST_JURISDICTION) {
    return [...NSW_TERMINATION_REASONS];
  }
  return [];
}

/**
 * Lodge a record-only termination request. `requestSource` is always the agent
 * path. Assigned account manager is chosen on the admin side.
 */
export async function createAgentTerminationRequest(
  propertyId: string,
  input: CreateAgentTerminationRequestInput,
): Promise<AgentTerminationRequestResult> {
  return agentFetch<AgentTerminationRequestResult>(
    `/agent/properties/${encodeURIComponent(propertyId)}/termination-requests`,
    {
      method: 'POST',
      body: JSON.stringify({
        reasonCode: input.reasonCode,
        jurisdictionCode: input.jurisdictionCode ?? TERMINATION_REQUEST_JURISDICTION,
        requestSource: TERMINATION_REQUEST_SOURCE_AGENT,
        tenantReferenceId: input.tenantReferenceId,
        tenantName: input.tenantName,
      }),
    },
  );
}
