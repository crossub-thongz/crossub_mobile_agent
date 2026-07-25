import { INSPECTION_RECORD_STATUS } from '@/constants/inspection-records';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { OnSiteProgression } from '@/lib/inspections-types';

/** Workflow phase slugs from `Inspection.workflowMeta.phase` (crossub_web). */
export const FIELD_INSPECTION_PHASE = {
  REPORT_PENDING_REVIEW: 'report_pending_review',
  SENT_FOR_SIGNATURE: 'sent_for_signature',
  REPORT_SIGNED: 'report_signed',
  REPORT_EXPIRED: 'report_expired',
  COMPLETED: 'completed',
} as const;

export type AgentTenantAckState =
  | 'not_available'
  | 'awaiting_report'
  | 'pending'
  | 'confirmed'
  | 'expired';

export function isReportSubmitted(
  record: InspectionRecord | null,
  progression: OnSiteProgression | null,
): boolean {
  if (!record && !progression) return false;
  if (progression?.reportUrl || record?.reportUrl) return true;
  const status = record?.status;
  if (!status) return false;
  return (
    status === INSPECTION_RECORD_STATUS.FIRST_REVIEW ||
    status === INSPECTION_RECORD_STATUS.SECOND_REVIEW ||
    status === INSPECTION_RECORD_STATUS.COMPLETED ||
    status === INSPECTION_RECORD_STATUS.PUBLISHED
  );
}

/** Mirrors crossub_web `InspectionReportPanel` — PDF available once the report is filed. */
export function canViewInspectionReport(
  record: InspectionRecord | null,
  progression: OnSiteProgression | null,
  options?: {
    reportUrl?: string | null;
    hasFindings?: boolean;
  },
): boolean {
  if (!isReportSubmitted(record, progression)) return false;
  const reportUrl = options?.reportUrl ?? progression?.reportUrl ?? record?.reportUrl;
  if (reportUrl?.trim()) return true;
  return isReportSubmitted(record, progression);
}

export function deriveTenantAckState(
  record: InspectionRecord | null,
  signName: string | null | undefined,
  signUrl: string | null | undefined,
  options?: {
    tenantReportSigned?: boolean;
    leasingTenantApproved?: boolean;
    leasingSignerName?: string | null;
  },
): { state: AgentTenantAckState; label: string } {
  if (!record) {
    return { state: 'not_available', label: '—' };
  }

  const phase = record.workflowPhase;
  const tenantReportSigned =
    options?.tenantReportSigned ??
    record.tenantReportSigned ??
    false;
  const leasingApproved = options?.leasingTenantApproved ?? false;
  const signed = Boolean(signUrl?.trim() || signName?.trim());
  const reportReady = isReportSubmitted(record, null);
  const signerLabel =
    signName?.trim() ||
    options?.leasingSignerName?.trim() ||
    undefined;

  if (
    signed ||
    tenantReportSigned ||
    leasingApproved ||
    phase === FIELD_INSPECTION_PHASE.REPORT_SIGNED
  ) {
    return {
      state: 'confirmed',
      label: signerLabel ? `Signed by ${signerLabel}` : 'Tenant acknowledged',
    };
  }

  if (phase === FIELD_INSPECTION_PHASE.REPORT_EXPIRED) {
    return { state: 'expired', label: 'Acknowledgement window expired' };
  }

  if (
    phase === FIELD_INSPECTION_PHASE.SENT_FOR_SIGNATURE ||
    record.status === INSPECTION_RECORD_STATUS.PUBLISHED
  ) {
    return { state: 'pending', label: 'Awaiting tenant acknowledgement' };
  }

  if (!reportReady) {
    return { state: 'awaiting_report', label: 'Available after report is submitted' };
  }

  if (
    record.status === INSPECTION_RECORD_STATUS.COMPLETED ||
    phase === FIELD_INSPECTION_PHASE.REPORT_PENDING_REVIEW
  ) {
    return { state: 'pending', label: 'Report submitted — tenant review pending' };
  }

  return { state: 'not_available', label: 'Not started' };
}

/** Outgoing job-case step: agent confirms the comparative report (not tenant sign-off). */
export function deriveAgentAckState(
  record: InspectionRecord | null,
  options?: {
    agentAcknowledged?: boolean;
    agentAcknowledgedAt?: string | null;
  },
): { state: AgentTenantAckState; label: string } {
  if (!record) {
    return { state: 'not_available', label: '—' };
  }

  if (options?.agentAcknowledged) {
    return {
      state: 'confirmed',
      label: 'Agent acknowledged',
    };
  }

  if (!isReportSubmitted(record, null)) {
    return { state: 'awaiting_report', label: 'Available after report is submitted' };
  }

  return { state: 'pending', label: 'Report submitted — agent review pending' };
}
