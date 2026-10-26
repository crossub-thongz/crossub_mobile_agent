import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { agentFetch } from './agent-client';
import { crossub } from './client';

export type AgentWorkflowCreateResult = { id: string; openInspectionId?: string };

export type CreateAgentTribunalRentChasingInput =
  components['schemas']['AgentCreateTribunalRentChasingDto'] & {
    platformChargeId?: string;
  };

const base = (propertyId: string) =>
  `/agent/properties/${encodeURIComponent(propertyId)}/workflows`;

export type CreateAgentLeasingCycleInput = components['schemas']['AgentCreateLeasingCycleDto'];

/** Proceed / Do not re-let / Decide later on an awaiting-confirmation leasing cycle. */
export type SetAgentReletDecisionInput = components['schemas']['AgentSetReletDecisionDto'];

export type CreateAgentRentReviewInput = {
  currentWeeklyRent: number;
  tenantName?: string;
  rentReviewDate?: string;
  leaseEndDate?: string;
  leaseType?: 'fixed' | 'periodic';
  fixedTermWeeks?: number;
  initialLeaseStartDate?: string;
  tenantRef?: string;
  managingAgentLabel?: string;
  proposedRent?: number;
  rentPeriod?: 'weekly' | 'fortnightly' | 'monthly';
  rentNegotiable?: boolean;
  rentPaidUntil?: string;
};

export type CreateAgentTerminationCaseInput = {
  terminationType?: 'termination' | 'tenant_initiated';
  terminationReason?: string;
  bondHeld?: number;
  expectedVacateDate?: string;
  terminationGround?: string;
  proposedTerminationDate?: string;
  breachClause?: string;
  breachConduct?: string;
};

export type CreateAgentMaintenanceInput = {
  issueType: string;
  description: string;
  address?: string;
  urgent?: boolean;
  urgentReason?: string;
  tenant?: { name: string; email?: string; phone?: string };
  photos: string[];
};

export type CreateAgentIngoingInspectionInput = {
  scheduledTime?: string;
  moveInDate?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  priority?: 'normal' | 'high' | 'urgent';
  accessInstructions?: string;
  notes?: string;
  leaseApprovalRef?: string;
  platformChargeId?: string;
};

export type CreateAgentOutgoingInspectionInput = {
  /**
   * @deprecated CRS-0068 — the server discards it. An agent raises a request; the account
   * manager sets the time and the agent is emailed it. Left on the type so an older screen
   * still compiles rather than being dropped and taking a build with it.
   */
  scheduledTime?: string;
  vacateDate?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  /** @deprecated CRS-0068 — who drives is CROSSUB's call. Discarded server-side. */
  inspectorName?: string;
  accessInstructions?: string;
  notes?: string;
  platformChargeId?: string;
};

export async function createAgentLeasingCycle(
  propertyId: string,
  body: CreateAgentLeasingCycleInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/leasing-cycle`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Answer the re-let confirmation gate. Until the answer is Proceed, every open-inspection
 * request on the cycle 409s (`LEASING_RELET_NOT_CONFIRMED`).
 */
export async function setAgentReletDecision(
  propertyId: string,
  cycleId: string,
  body: SetAgentReletDecisionInput,
): Promise<components['schemas']['AgentWorkflowCreateResultDto']> {
  return agentFetch(
    `${base(propertyId)}/leasing-cycle/${encodeURIComponent(cycleId)}/relet-decision`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function cancelAgentLeasingCycle(
  propertyId: string,
  cycleId: string,
  body: { reason: string; force?: boolean },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/leasing-cycle/${encodeURIComponent(cycleId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ ...body, force: body.force ?? true }),
  });
}

// ---------------------------------------------------------------------------------------------
// Self-Manage letting (Phase 2): the Account Manager's letting steps, run by the agent.
// Self-Manage properties only — the server returns 403 for every other plan. Each write returns
// `{ id: cycleId }`; re-read the cycle (`leasingOpsApi.get`) for the new state.
// ---------------------------------------------------------------------------------------------

type AgentWorkflowCreateResultDto = components['schemas']['AgentWorkflowCreateResultDto'];

export type AddNegotiationRoundInput = components['schemas']['AddNegotiationRoundDto'];
export type RespondToNegotiationRoundInput =
  components['schemas']['RespondToNegotiationRoundDto'];
export type RequestApplicantInformationInput =
  components['schemas']['RequestApplicantInformationDto'];
export type UpdateLettingContractInput = components['schemas']['UpdateContractDto'];
export type AddLettingContractConditionInput = components['schemas']['AddContractConditionDto'];
export type UploadLettingContractInput = components['schemas']['UploadContractDto'];
export type UploadLettingSignedAgreementInput =
  components['schemas']['UploadSignedAgreementDto'];
export type SetLettingBondLinkInput = components['schemas']['SetBondLinkDto'];
export type AgentRentReviewTenantResponseInput = components['schemas']['TenantResponseDto'];
export type AgentRentReviewResult = components['schemas']['AgentRentReviewResultDto'];

const lettingPath = (propertyId: string, cycleId: string) => ({ propertyId, cycleId });

export async function addSelfManagedNegotiationRound(
  propertyId: string,
  cycleId: string,
  applicationId: string,
  body: AddNegotiationRoundInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/negotiation',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't propose the terms");
}

export async function respondToSelfManagedNegotiationRound(
  propertyId: string,
  cycleId: string,
  applicationId: string,
  roundId: string,
  body: RespondToNegotiationRoundInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/negotiation/{roundId}/respond',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId, roundId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't answer the terms");
}

export async function requestSelfManagedApplicantInformation(
  propertyId: string,
  cycleId: string,
  applicationId: string,
  body: RequestApplicantInformationInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/request-info',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't email the applicant");
}

export async function updateSelfManagedContract(
  propertyId: string,
  cycleId: string,
  body: UpdateLettingContractInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.PATCH(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't save the agreement terms");
}

export async function addSelfManagedContractCondition(
  propertyId: string,
  cycleId: string,
  body: AddLettingContractConditionInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract/conditions',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't add the condition");
}

export async function confirmSelfManagedContract(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract/confirm',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't confirm the draft");
}

export async function regenerateSelfManagedContract(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract/regenerate',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't regenerate the agreement");
}

export async function sendSelfManagedContractToTenant(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract/send-to-tenant',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't send the agreement");
}

export async function uploadSelfManagedContract(
  propertyId: string,
  cycleId: string,
  body: UploadLettingContractInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/contract/upload',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't upload the agreement");
}

export async function uploadSelfManagedSignedAgreement(
  propertyId: string,
  cycleId: string,
  body: UploadLettingSignedAgreementInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/agreement/signed-copy',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't upload the signed copy");
}

export async function setSelfManagedBondLink(
  propertyId: string,
  cycleId: string,
  body: SetLettingBondLinkInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/bond-link',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't send the bond link");
}

export async function generateSelfManagedOpenReport(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-report/generate',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't generate the open report");
}

export async function orderSelfManagedIngoingInspection(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/ingoing/order',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't order the ingoing inspection");
}

// Screening: the reference check on one applicant, and skipping screening.

export type AgentReferenceCheck = components['schemas']['AgentReferenceCheckDto'];
export type AgentReferenceReferee = components['schemas']['AgentApplicationRefereeDto'];
export type RecordReferenceCheckInput = components['schemas']['SetApplicantFeedbackDto'];
export type RejectOnboardingProofInput = components['schemas']['RejectOnboardingProofDto'];

export async function fetchSelfManagedReferenceCheck(
  propertyId: string,
  cycleId: string,
  applicationId: string,
): Promise<AgentReferenceCheck> {
  const result = await crossub.GET(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/reference-check',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId } } },
  );
  return unwrapCrossubResult(result, "Couldn't load the reference check");
}

export async function recordSelfManagedReferenceCheck(
  propertyId: string,
  cycleId: string,
  applicationId: string,
  body: RecordReferenceCheckInput,
): Promise<AgentReferenceCheck> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/reference-check',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't save the reference check");
}

/** Cros condenses the recorded notes. Stores nothing; `summaryNotice` says why when empty. */
export async function summariseSelfManagedReferenceCheck(
  propertyId: string,
  cycleId: string,
  applicationId: string,
): Promise<AgentReferenceCheck> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/{applicationId}/reference-check/summarise',
    { params: { path: { ...lettingPath(propertyId, cycleId), applicationId } } },
  );
  return unwrapCrossubResult(result, "Couldn't summarise the notes");
}

export async function skipSelfManagedApplicationScreening(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/applications/skip-screening',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't skip screening");
}

// Create tenancy: the agency records the tenants and lease it agreed; the letting closes onto it.

export type CreateSelfManagedTenancyInput = components['schemas']['RecordAgencyTenancyDto'];
export type SelfManagedTenancyParty = components['schemas']['ManualApplicantPartyDto'];

export async function createSelfManagedTenancy(
  propertyId: string,
  cycleId: string,
  body: CreateSelfManagedTenancyInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/tenancy',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't create the tenancy");
}

// Money: holding deposit and bond. "Mark paid" posts the receipt to the property ledger.

export async function markSelfManagedDepositPaid(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/deposit-paid',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't mark the deposit paid");
}

export async function approveSelfManagedDepositProof(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/deposit-proof/approve',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't approve the deposit proof");
}

export async function rejectSelfManagedDepositProof(
  propertyId: string,
  cycleId: string,
  body: RejectOnboardingProofInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/deposit-proof/reject',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't reject the deposit proof");
}

export async function markSelfManagedBondPaid(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/bond-paid',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't mark the bond paid");
}

export async function approveSelfManagedBondProof(
  propertyId: string,
  cycleId: string,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/bond-proof/approve',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't approve the bond proof");
}

export async function rejectSelfManagedBondProof(
  propertyId: string,
  cycleId: string,
  body: RejectOnboardingProofInput,
): Promise<AgentWorkflowCreateResultDto> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/onboarding/bond-proof/reject',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't reject the bond proof");
}

/** The tenant's answer to a rent offer, keyed in by the agent (Self-Manage only). */
export async function recordSelfManagedRentReviewTenantResponse(
  propertyId: string,
  reviewId: string,
  body: AgentRentReviewTenantResponseInput,
): Promise<AgentRentReviewResult> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/rent-review/{reviewId}/negotiation/tenant-response',
    { params: { path: { propertyId, reviewId } }, body },
  );
  return unwrapCrossubResult(result, "Couldn't record the tenant's response");
}

export type RequestAgentOpenInspectionInput = {
  preferredStartTime?: string;
  preferredEndTime?: string;
  preferredNotes?: string;
  keyCollectLocation?: string;
  /** Begin the viewing window immediately (testing) — skips Saturday validation. */
  startNow?: boolean;
  /** Prepaid CROSSUB platform charge — required when billing prepaid is enabled. */
  platformChargeId?: string;
};

export async function requestAgentOpenInspection(
  propertyId: string,
  cycleId: string,
  body: RequestAgentOpenInspectionInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/leasing-cycle/${encodeURIComponent(cycleId)}/open-inspection/request`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

/**
 * Ask CROSSUB to run routine inspections at a property (CRS-0068).
 *
 * Replaces the create wizard's direct calls to `/inspections/routine` — the **staff**
 * routine console — which wrote `nextInspectionDate` and started instances on a date the
 * agent typed, and whose `start` emails the tenant. No date crosses this boundary: the
 * cadence follows the property's state (NSW 3/yr, VIC 2/yr) and each instance date is the
 * account manager's.
 */
export async function requestAgentRoutineInspection(
  propertyId: string,
  body: { flow?: 'self' | 'in_person'; note?: string; platformChargeId?: string } = {},
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/inspection/routine`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function startAgentOpenInspectionNow(
  propertyId: string,
  cycleId: string,
  body: Pick<RequestAgentOpenInspectionInput, 'keyCollectLocation'> = {},
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/leasing-cycle/${encodeURIComponent(cycleId)}/open-inspection/start-now`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function scheduleAgentSelfOpenInspection(
  propertyId: string,
  cycleId: string,
  body: RequestAgentOpenInspectionInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/leasing-cycle/${encodeURIComponent(cycleId)}/open-inspection/self-schedule`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function cancelAgentOpenInspection(
  propertyId: string,
  inspectionId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/open-inspection/${encodeURIComponent(inspectionId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

/**
 * The agent confirms the time CROSSUB scheduled for their open inspection.
 *
 * The server refuses until an inspector is on the job **and** a time is set, and refuses a
 * second confirmation — so the UI's job is to only offer the button when it will succeed,
 * and to report the server's reason when it does not. `agentConfirmedAt` comes back from
 * the server rather than being stamped here: the handset's clock and the server's disagree,
 * and the server's is the one CROSSUB staff read off the Task Pool.
 *
 * Typed locally rather than from `components['schemas']`, matching `AgentWorkflowCreateResult`
 * above: the published contract is 0.13.0 and this route lands in the next publish.
 */
export type AgentOpenInspectionConfirmResult = {
  id: string;
  agentConfirmedAt: string;
};

export async function confirmAgentOpenInspectionSchedule(
  propertyId: string,
  inspectionId: string,
): Promise<AgentOpenInspectionConfirmResult> {
  return agentFetch(
    `${base(propertyId)}/open-inspection/${encodeURIComponent(inspectionId)}/confirm-schedule`,
    { method: 'POST' },
  );
}

export async function cancelAgentTerminationCase(
  propertyId: string,
  caseId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/end-leasing/${encodeURIComponent(caseId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function cancelAgentRentReview(
  propertyId: string,
  reviewId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/rent-review/${encodeURIComponent(reviewId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function createAgentRentReview(
  propertyId: string,
  body: CreateAgentRentReviewInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/rent-review`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createAgentTerminationCase(
  propertyId: string,
  body: CreateAgentTerminationCaseInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/end-leasing`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function cancelAgentMaintenance(
  propertyId: string,
  requestId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/maintenance/${encodeURIComponent(requestId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function createAgentMaintenanceRequest(
  propertyId: string,
  body: CreateAgentMaintenanceInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Stage maintenance evidence (base64 → R2) before logging the job. */
export async function uploadMaintenancePhoto(
  propertyId: string,
  input: { fileName: string; mimeType: string; sizeBytes: number; contentBase64: string },
): Promise<{ url: string }> {
  return agentFetch(`${base(propertyId)}/maintenance/photos/upload`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createAgentIngoingInspection(
  propertyId: string,
  body: CreateAgentIngoingInspectionInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/inspection/ingoing`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createAgentOutgoingInspection(
  propertyId: string,
  body: CreateAgentOutgoingInspectionInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/inspection/outgoing`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function cancelAgentIngoingInspection(
  propertyId: string,
  inspectionId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/inspection/ingoing/${encodeURIComponent(inspectionId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function cancelAgentOutgoingInspection(
  propertyId: string,
  inspectionId: string,
  body: { reason: string },
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(
    `${base(propertyId)}/inspection/outgoing/${encodeURIComponent(inspectionId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

/** Record rent reconciliation on the property ledger. */
export type AgentRecordRentReconciliationInput = {
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'cheque' | 'card' | 'eft';
  rentAllocation?: number;
  bondAllocation?: number;
  rentDescription?: string;
  bondDescription?: string;
  note?: string;
};

export async function createAgentPropertyArrears(
  propertyId: string,
  body: CreateAgentTribunalRentChasingInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/accounting/arrears`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type AgentMarkArrearsPaidInput = {
  paidDate: string;
  kinds?: Array<'rent' | 'bill' | 'bond'>;
  items?: Array<{
    caseId: string;
    kind: 'rent' | 'bill' | 'bond';
    billIndex?: number;
  }>;
};

export async function markAgentPropertyArrearsPaid(
  propertyId: string,
  body: AgentMarkArrearsPaidInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/accounting/arrears/paid`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createAgentRentReconciliation(
  propertyId: string,
  body: AgentRecordRentReconciliationInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/accounting/rent-reconciliation`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Open a Rent Chasing tribunal case and sync rent/bond/bill fields to the property profile. */
export async function createAgentTribunalRentChasing(
  propertyId: string,
  body: CreateAgentTribunalRentChasingInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/tribunal/rent-chasing`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type AgentTribunalRentChasingPrefill = {
  propertyId: string;
  propertyAddress: string;
  tenantName: string | null;
  hasAccountingArrears: boolean;
  arrears: Array<{
    caseId?: string;
    billIndex?: number;
    kind: 'rent' | 'bill' | 'bond';
    name: string;
    tenantName: string;
    amount: number | null;
    daysOverdue: number | null;
    dueDate: string | null;
  }>;
  rentArrears: CreateAgentTribunalRentChasingInput['rentArrears'] | null;
  billArrears: NonNullable<CreateAgentTribunalRentChasingInput['billArrears']>;
  agreementEndDate?: string | null;
  leaseStartDate?: string | null;
  bondArrears: CreateAgentTribunalRentChasingInput['bondArrears'] | null;
  payments?: Array<{
    amount: number;
    paidDate: string;
    remaining: number;
    caseId?: string;
  }>;
};

export async function fetchAgentTribunalRentChasingPrefill(
  propertyId: string,
): Promise<AgentTribunalRentChasingPrefill> {
  return agentFetch(`${base(propertyId)}/tribunal/rent-chasing/prefill`);
}

export type AgentTribunalRentChasingDetail =
  components['schemas']['AgentTribunalRentChasingDetailDto'];

export type AgentUpdateTribunalRentChasingInput =
  components['schemas']['AgentUpdateTribunalRentChasingDto'];

export async function fetchAgentTribunalRentChasingDetail(
  caseId: string,
): Promise<AgentTribunalRentChasingDetail> {
  return agentFetch(`/agent/tribunal/${encodeURIComponent(caseId)}`);
}

export async function updateAgentTribunalRentChasing(
  caseId: string,
  body: AgentUpdateTribunalRentChasingInput,
): Promise<AgentTribunalRentChasingDetail> {
  return agentFetch(`/agent/tribunal/${encodeURIComponent(caseId)}/rent-chasing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteAgentTribunalCase(
  caseId: string,
  reason: string,
): Promise<void> {
  await agentFetch(`/agent/tribunal/${encodeURIComponent(caseId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export type AgentTaskKind =
  | 'inspection'
  | 'leasing'
  | 'maintenance'
  | 'rent_review'
  | 'end_leasing'
  | 'tribunal';

export type AgentTaskLifecycleResult = {
  id: string;
  kind: AgentTaskKind;
  action: 'force_completed' | 'force_deleted';
  status: 'COMPLETED' | 'DELETED';
};

export async function forceCompleteAgentTask(
  kind: AgentTaskKind,
  taskId: string,
): Promise<AgentTaskLifecycleResult> {
  return agentFetch(
    `/agent/tasks/${encodeURIComponent(kind)}/${encodeURIComponent(taskId)}/force-complete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function forceDeleteAgentTask(
  kind: AgentTaskKind,
  taskId: string,
): Promise<AgentTaskLifecycleResult> {
  return agentFetch(
    `/agent/tasks/${encodeURIComponent(kind)}/${encodeURIComponent(taskId)}/force-delete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export type AgentTaskAuditLogEntry = {
  id: string;
  at: string;
  action: 'force_completed' | 'force_deleted';
  label: string;
  sentence: string;
  actor: string;
  taskType?: string;
  previousStatus?: string;
};

export async function fetchAgentTaskAuditLog(
  kind: AgentTaskKind,
  taskId: string,
): Promise<{ entries: AgentTaskAuditLogEntry[] }> {
  return agentFetch(
    `/agent/tasks/${encodeURIComponent(kind)}/${encodeURIComponent(taskId)}/audit-log`,
  );
}
