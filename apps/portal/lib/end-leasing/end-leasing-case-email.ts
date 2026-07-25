import { TERMINATION_TYPE } from '@/constants/end-leasing';
import {
  dedupeJobCaseEmails,
  mimeTypeForAttachmentFilename,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import { buildTerminationNoticeEmailPreview } from '@/lib/end-leasing/termination-notice-email-preview';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

export function terminationNoticePdfUrl(caseId: string): string {
  return `/api/end-leasing/cases/${caseId}/notice-to-terminate.pdf`;
}

export function terminationDocumentDownloadUrl(caseId: string, documentId: string): string {
  return `/api/end-leasing/cases/${caseId}/documents/${documentId}/download`;
}

function terminationNoticeAttachments(
  caseData: TerminationCaseDetail,
): JobCaseEmailRecord['attachments'] {
  const caseRef =
    caseData.taskNumber?.trim() ||
    `TC-${caseData.id.slice(0, 8).toUpperCase()}`;
  const attachments: NonNullable<JobCaseEmailRecord['attachments']> = [
    {
      name: `notice-to-terminate-${caseRef}.pdf`,
      mimeType: 'application/pdf',
      url: terminationNoticePdfUrl(caseData.id),
    },
  ];

  for (const doc of caseData.documents ?? []) {
    attachments.push({
      name: doc.name,
      mimeType: mimeTypeForAttachmentFilename(doc.name),
      url: terminationDocumentDownloadUrl(caseData.id, doc.id),
    });
  }

  return attachments;
}

function inspectionReportAttachments(
  caseData: TerminationCaseDetail,
): JobCaseEmailRecord['attachments'] {
  const attachments: NonNullable<JobCaseEmailRecord['attachments']> = [];
  const inspection = caseData.inspection;

  if (inspection.outgoingReportUrl && inspection.inspectionId) {
    attachments.push({
      name: 'outgoing-inspection-report.pdf',
      mimeType: 'application/pdf',
      url: `/api/inspections/${inspection.inspectionId}/report/pdf`,
    });
  }

  if (inspection.ingoingReportUrl && inspection.ingoingInspectionId) {
    attachments.push({
      name: 'ingoing-inspection-report.pdf',
      mimeType: 'application/pdf',
      url: `/api/inspections/${inspection.ingoingInspectionId}/report/pdf`,
    });
  }

  return attachments;
}

export function buildLandlordTerminationNoticeEmailRecord(
  caseData: TerminationCaseDetail,
): JobCaseEmailRecord | null {
  const notice = caseData.terminationNotice;
  if (!notice?.emailSent && !notice?.noticeEmailSentAt) return null;
  if (caseData.terminationType !== TERMINATION_TYPE.TERMINATION) return null;

  const preview = buildTerminationNoticeEmailPreview({
    propertyAddress: caseData.property.address,
    tenantName: caseData.tenant.name,
    agentName: caseData.agentName,
    ground: notice.ground,
    terminationDate: notice.terminationDate,
    noticePeriodDays: notice.noticePeriodDays,
    terminationReason: notice.groundLabel,
    breachClause: notice.breachClause,
    breachConduct: notice.breachConduct,
  });

  return {
    id: `${caseData.id}-termination-notice`,
    subject: `Notice to terminate tenancy — ${caseData.property.address}`,
    body: preview,
    from: caseData.agentName?.trim() || 'Managing Agent',
    to: caseData.tenant.email?.trim() || caseData.tenant.name || 'Tenant',
    at: notice.noticeEmailSentAt ?? caseData.createdAt,
    kind: 'termination_notice',
    attachments: terminationNoticeAttachments(caseData),
  };
}

export function enrichEndLeasingEmailRecords(
  caseData: TerminationCaseDetail,
  records: JobCaseEmailRecord[],
): JobCaseEmailRecord[] {
  const reportAttachments = inspectionReportAttachments(caseData);

  return records.map((record) => {
    if (record.attachments?.length) return record;

    if (record.kind === 'termination_notice') {
      return { ...record, attachments: terminationNoticeAttachments(caseData) };
    }

    if (
      reportAttachments.length > 0 &&
      (record.kind === 'tenant_comparison' ||
        record.kind === 'agent_comparison' ||
        record.kind === 'agent_repair_quote' ||
        record.kind === 'landlord_repair_quote' ||
        record.kind === 'tenant_repair_quote')
    ) {
      return { ...record, attachments: reportAttachments };
    }

    return record;
  });
}
