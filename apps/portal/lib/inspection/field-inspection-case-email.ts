import { INSPECTION_RECORD_TYPE, type InspectionRecordType } from '@/constants/inspection-records';
import {
  persistedCaseEmailRecords,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionRecord } from '@/lib/inspections-types';
import { buildInspectionReportFilename } from '@/lib/inspection-report-pdf';

/** Email kinds that blast the inspection report PDF to recipients. */
const REPORT_DISTRIBUTION_KINDS = new Set([
  'ingoing_report_distributed',
  'outgoing_report_distributed',
  'open_inspection_report',
]);

function inspectionTypeForFilename(
  type: InspectionRecordType | string | null | undefined,
): 'ingoing' | 'outgoing' | 'routine' | 'open' {
  switch (type) {
    case INSPECTION_RECORD_TYPE.OUTGOING:
      return 'outgoing';
    case INSPECTION_RECORD_TYPE.ROUTINE:
      return 'routine';
    case INSPECTION_RECORD_TYPE.OPEN:
      return 'open';
    default:
      return 'ingoing';
  }
}

/** Extract inspection id from persisted case email ids (`*-report-{uuid}-*`). */
export function inspectionIdFromCaseEmailId(emailId: string): string | null {
  const match = emailId.match(
    /^(?:ingoing|outgoing|open)-report-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i,
  );
  return match?.[1] ?? null;
}

/**
 * Persisted workflow emails plus synthesized PDF attachments for report-blast rows.
 * Open inspection history builds attachments client-side; field inspections store
 * only email metadata on `caseEmails` — the report PDF URL comes from the inspection row.
 */
export function enrichFieldInspectionCaseEmails(
  record: InspectionRecord | null | undefined,
): JobCaseEmailRecord[] {
  const emails = persistedCaseEmailRecords(record);
  if (!record?.reportUrl) return emails;

  const propertyLabel = record.propertyAddress?.trim() || 'property';
  const inspectionType = inspectionTypeForFilename(record.type);
  const filename = buildInspectionReportFilename(propertyLabel, inspectionType);
  const pdfUrl = inspectionsApi.reportPdfUrl(record.id);

  return emails.map((email) => {
    if (!email.kind || !REPORT_DISTRIBUTION_KINDS.has(email.kind)) return email;
    if (email.attachments?.length) return email;
    return {
      ...email,
      attachments: [
        {
          name: filename,
          mimeType: 'application/pdf',
          url: pdfUrl,
        },
      ],
    };
  });
}
