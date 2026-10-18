import type { components } from '@crossub-thongz/api-contract';

import type { AgencyTeamResponse } from '@/lib/crossub-api/agent-client';
import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { CROSSUB_API_V1_BASE, crossub } from './client';

// ---------------------------------------------------------------------------------------------
// Self-Manage inspections (Phase 1): the agency's own inspectors conduct ingoing, outgoing and
// routine jobs, and the principal signs the report off. Self-Manage properties only — the server
// returns 403 for every other plan. Each action returns the refreshed inspection detail.
// ---------------------------------------------------------------------------------------------

export type AgentInspectionDetail = components['schemas']['AgentInspectionDetailDto'];
export type AgentInspectionOwnerCopy = components['schemas']['AgentInspectionOwnerCopyDto'];
export type CreateAgencyInspectionInput = components['schemas']['AgentCreateAgencyInspectionDto'];
export type RejectAgencyInspectionReportInput = components['schemas']['RejectInspectionReportDto'];
export type ReassignAgencyInspectionInput =
  components['schemas']['AgentReassignAgencyInspectionDto'];

/** One inspection with what the agent can do next (`GET /agent/inspections/{inspectionId}`). */
export async function fetchAgentInspectionDetail(
  inspectionId: string,
): Promise<AgentInspectionDetail> {
  const result = await crossub.GET('/agent/inspections/{inspectionId}', {
    params: { path: { inspectionId } },
  });
  return unwrapCrossubResult(result, "Couldn't load the inspection");
}

/** Book a job with one of the agency's inspectors — no prepaid gate, no CROSSUB charge. */
export async function createAgencyInspection(
  propertyId: string,
  body: CreateAgencyInspectionInput,
): Promise<AgentInspectionDetail> {
  const result = await crossub.POST('/agent/properties/{propertyId}/inspections/agency', {
    params: { path: { propertyId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't book the inspection");
}

/** Principal approves the report; the server emails the tenant (ingoing/outgoing) and the owner. */
export async function signOffAgencyInspection(
  inspectionId: string,
): Promise<AgentInspectionDetail> {
  const result = await crossub.POST('/agent/inspections/{inspectionId}/agency-sign-off', {
    params: { path: { inspectionId } },
  });
  return unwrapCrossubResult(result, "Couldn't sign the report off");
}

/** Principal sends an ingoing or outgoing report back to the inspector to redo. */
export async function rejectAgencyInspectionReport(
  inspectionId: string,
  body: RejectAgencyInspectionReportInput,
): Promise<AgentInspectionDetail> {
  const result = await crossub.POST('/agent/inspections/{inspectionId}/agency-reject-report', {
    params: { path: { inspectionId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't send the report back");
}

/** Move an agency job to another agency inspector, before it is completed. */
export async function setInspectionConductedBy(
  inspectionId: string,
  body: ReassignAgencyInspectionInput,
): Promise<AgentInspectionDetail> {
  const result = await crossub.PATCH('/agent/inspections/{inspectionId}/conducted-by', {
    params: { path: { inspectionId } },
    body,
  });
  return unwrapCrossubResult(result, "Couldn't change the inspector");
}

/** Same-origin report PDF link through the BFF proxy (the session cookie rides along). */
export function agencyInspectionReportPdfUrl(inspectionId: string): string {
  return `${CROSSUB_API_V1_BASE}/agent/inspections/${encodeURIComponent(inspectionId)}/report/pdf`;
}

/** The report PDF as a blob, for a named download. */
export async function downloadAgencyInspectionReportPdf(inspectionId: string): Promise<Blob> {
  const result = await crossub.GET('/agent/inspections/{inspectionId}/report/pdf', {
    params: { path: { inspectionId } },
    parseAs: 'blob',
  });
  return unwrapCrossubResult(result, "Couldn't download the report");
}

/** Principal makes a team member an agency inspector; returns the refreshed team. */
export async function grantAgencyInspector(
  agencyId: string,
  userId: string,
): Promise<AgencyTeamResponse> {
  const result = await crossub.POST('/agent/agencies/{agencyId}/inspectors/{userId}', {
    params: { path: { agencyId, userId } },
  });
  return unwrapCrossubResult(result, "Couldn't make them an inspector");
}

/** Principal removes an agency inspector (deactivated when they have job history). */
export async function revokeAgencyInspector(
  agencyId: string,
  userId: string,
): Promise<AgencyTeamResponse> {
  const result = await crossub.DELETE('/agent/agencies/{agencyId}/inspectors/{userId}', {
    params: { path: { agencyId, userId } },
  });
  return unwrapCrossubResult(result, "Couldn't remove the inspector");
}
