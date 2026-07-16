import { agentFetch } from './agent-client';

export type AgentWorkflowCreateResult = { id: string; openInspectionId?: string };

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
