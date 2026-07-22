import type { components } from '@crossub-thongz/api-contract';

import { agentFetch } from './agent-client';

export type AgentWorkflowCreateResult = { id: string; openInspectionId?: string };

export type CreateAgentTribunalRentChasingInput =
  components['schemas']['AgentCreateTribunalRentChasingDto'];

const base = (propertyId: string) =>
  `/agent/properties/${encodeURIComponent(propertyId)}/workflows`;

export type CreateAgentLeasingCycleInput = {
  agentName?: string;
  agentCompany?: string;
  agentEmail?: string;
  agentPhone?: string;
  rentPerWeek: number;
  availableFrom: string;
  fixedTermWeeks?: number;
  tenantMovedOut?: boolean;
  tenantMovedOutDate?: string;
  notes?: string;
  skipOpenInspection?: boolean;
  agentConductsOpenInspection?: boolean;
};

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
  tenant?: { name: string; email?: string; phone?: string };
  photos?: string[];
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

export type RequestAgentOpenInspectionInput = {
  preferredStartTime?: string;
  preferredEndTime?: string;
  preferredNotes?: string;
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

/** Record rent reconciliation on the property ledger. */
export type AgentRecordRentReconciliationInput = {
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'cheque' | 'card' | 'eft';
  rentAllocation?: number;
  bondAllocation?: number;
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
    kind: 'rent' | 'bill' | 'bond';
    name: string;
    tenantName: string;
    amount: number | null;
    daysOverdue: number | null;
    dueDate: string | null;
  }>;
  rentArrears: CreateAgentTribunalRentChasingInput['rentArrears'] | null;
  billArrears: NonNullable<CreateAgentTribunalRentChasingInput['billArrears']>;
  bondArrears: CreateAgentTribunalRentChasingInput['bondArrears'] | null;
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
