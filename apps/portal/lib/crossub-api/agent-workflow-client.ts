import { agentFetch } from './agent-client';

export type AgentWorkflowCreateResult = { id: string };

const base = (propertyId: string) =>
  `/agent/properties/${encodeURIComponent(propertyId)}/workflows`;

export type CreateAgentLeasingCycleInput = {
  agentName?: string;
  agentCompany?: string;
  agentEmail?: string;
  agentPhone?: string;
  keyCustody?: 'crossub' | 'agent';
  rentPerWeek: number;
  availableFrom: string;
  deposit?: number;
  bond?: number;
  skipOpenInspection?: boolean;
};

export type CreateAgentRentReviewInput = {
  currentWeeklyRent: number;
  tenantName?: string;
  rentReviewDate?: string;
  leaseType?: 'fixed' | 'periodic';
  fixedTermWeeks?: number;
  initialLeaseStartDate?: string;
  tenantRef?: string;
  managingAgentLabel?: string;
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
};

export type CreateAgentIngoingInspectionInput = {
  scheduledTime?: string;
  moveInDate?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  priority?: 'normal' | 'urgent';
  accessInstructions?: string;
  leaseApprovalRef?: string;
  manualNotes?: string;
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

export async function createAgentMaintenanceRequest(
  propertyId: string,
  body: CreateAgentMaintenanceInput,
): Promise<AgentWorkflowCreateResult> {
  return agentFetch(`${base(propertyId)}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(body),
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
