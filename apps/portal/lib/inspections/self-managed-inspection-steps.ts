import { INSPECTION_STATUS } from '@/constants/api-enums';
import { AGENCY_REPORT_TENANT_TYPES } from '@/constants/self-managed-inspections';
import type {
  AgentInspectionDetail,
  AgentInspectionOwnerCopy,
} from '@/lib/crossub-api/agent-inspection-client';

/** Which Self-Manage steps apply to an agency-conducted inspection right now, read off its detail. */
export interface SelfManagedInspectionSteps {
  /** A Self-Manage job the agency's own inspector conducts — the panel shows nothing otherwise. */
  agencyJob: boolean;
  /** The caller can move the job to another agency inspector (before it is completed). */
  reassign: boolean;
  /** The inspector has not submitted the report yet. */
  awaitingReport: boolean;
  /** The report PDF can be opened for review. */
  review: boolean;
  /** The caller (a principal) can sign the report off now. */
  signOff: boolean;
  /** The caller can send the report back — ingoing and outgoing only. */
  reject: boolean;
  /** Submitted and not signed off, but the caller is not a principal. */
  awaitingPrincipal: boolean;
  /** The report was sent back and the inspector has not resubmitted. */
  declineReason: string | null;
  /** When the principal signed the report off; null until then. */
  signedOffAt: string | null;
  /** The tenant gets a copy on sign-off (ingoing and outgoing). */
  tenantCopyApplies: boolean;
  /** When the tenant copy was emailed. */
  tenantSentAt: string | null;
  /** The owner copy sent on sign-off. */
  ownerCopy: AgentInspectionOwnerCopy | null;
}

export function selfManagedInspectionSteps(
  detail: AgentInspectionDetail,
): SelfManagedInspectionSteps {
  const agencyJob = detail.selfManaged && detail.conductedByAgency;
  const cancelled = detail.status === INSPECTION_STATUS.CANCELLED;
  const signedOffAt = detail.approvedByAgencyAt ?? null;
  const submitted = detail.reportSubmittedAt !== null;
  const tenantCopyApplies = AGENCY_REPORT_TENANT_TYPES.includes(detail.type);
  const declineReason = detail.reportDeclineReason?.trim() || null;
  const live = agencyJob && !cancelled;
  return {
    agencyJob,
    reassign: live && detail.canReassign,
    awaitingReport: live && !submitted,
    review: live && detail.reportPdfPath !== null,
    signOff: live && detail.canSignOff,
    reject: live && detail.canSignOff && tenantCopyApplies,
    awaitingPrincipal: live && submitted && signedOffAt === null && !detail.canSignOff,
    declineReason: live && signedOffAt === null ? declineReason : null,
    signedOffAt: agencyJob ? signedOffAt : null,
    tenantCopyApplies,
    tenantSentAt: detail.tenantReportSentAt ?? null,
    ownerCopy: detail.ownerCopy,
  };
}
