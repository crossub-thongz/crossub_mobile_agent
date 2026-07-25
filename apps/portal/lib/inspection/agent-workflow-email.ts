import { INSPECTION_STATUS } from '@/constants/api-enums';
import {
  dedupeJobCaseEmails,
  mergeJobCaseEmailSources,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import { enrichFieldInspectionCaseEmails } from '@/lib/inspection/field-inspection-case-email';
import { formatAgentSender } from '@/lib/job-case-email-sender';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';

const agentFrom = () => formatAgentSender();

export type InspectionWorkflowEmailStep =
  | 'scheduled'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'published';

const INSPECTION_EMAIL_STEPS: InspectionWorkflowEmailStep[] = [
  'scheduled',
  'in_progress',
  'review',
  'completed',
  'published',
];

function resolveInspectionEmailStep(apiStatus?: string): InspectionWorkflowEmailStep {
  switch (apiStatus) {
    case INSPECTION_STATUS.DRAFT:
      return 'scheduled';
    case INSPECTION_STATUS.IN_PROGRESS:
      return 'in_progress';
    case INSPECTION_STATUS.FIRST_REVIEW:
    case INSPECTION_STATUS.SECOND_REVIEW:
      return 'review';
    case INSPECTION_STATUS.COMPLETED:
      return 'completed';
    case INSPECTION_STATUS.PUBLISHED:
      return 'published';
    default:
      return 'scheduled';
  }
}

function timelineEmailRecords(inspection: Inspection): JobCaseEmailRecord[] {
  return inspection.timeline
    .filter(
      (entry) =>
        entry.source === 'email' || /email|notif|sent|remind|notice/i.test(entry.title),
    )
    .map((entry) => ({
      id: entry.id,
      subject: entry.title,
      body: entry.detail ?? entry.title,
      from: entry.actor,
      to: inspection.type === 'OPEN' ? 'Applicants' : 'Tenant',
      at: entry.at,
      kind: 'timeline_email',
    }));
}

function scheduledEmails(inspection: Inspection): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  if (inspection.scheduledAt) {
    records.push({
      id: `${inspection.id}-scheduled`,
      subject: `${inspection.type} inspection scheduled`,
      body: `Inspection scheduled for ${inspection.propertyAddress}.\n\nInspector: ${inspection.inspector ?? 'TBC'}`,
      from: 'CROSSUB',
      to: inspection.type === 'OPEN' ? 'Applicants' : 'Tenant',
      at: inspection.scheduledAt,
      kind: 'inspection_scheduled',
    });
  }
  if (inspection.agentTenantNotifiedAt) {
    records.push({
      id: `${inspection.id}-tenant-notified`,
      subject: 'Tenant notified of inspection',
      body: 'Agent confirmed the tenant was notified about the open inspection.',
      ...agentFrom(),
      to: 'Tenant',
      at: inspection.agentTenantNotifiedAt,
      kind: 'tenant_notified',
    });
  }
  return records;
}

function publishedEmails(inspection: Inspection): JobCaseEmailRecord[] {
  if (inspection.reportStatus !== 'sent' && inspection.apiStatus !== INSPECTION_STATUS.PUBLISHED) {
    return [];
  }
  const at =
    inspection.timeline[inspection.timeline.length - 1]?.at ?? inspection.createdAt ?? '';
  if (!at) return [];
  return [
    {
      id: `${inspection.id}-report-sent`,
      subject: `Inspection report published — ${inspection.propertyAddress}`,
      body: 'Final inspection report sent to landlord and tenant.',
      ...agentFrom(),
      to: 'Landlord & tenant',
      at,
      kind: 'report_published',
    },
  ];
}

function emailRecordsForStepOnly(
  inspection: Inspection,
  step: InspectionWorkflowEmailStep,
): JobCaseEmailRecord[] {
  switch (step) {
    case 'scheduled':
      return [...scheduledEmails(inspection), ...timelineEmailRecords(inspection)];
    case 'in_progress':
    case 'review':
    case 'completed':
      return timelineEmailRecords(inspection);
    case 'published':
      return publishedEmails(inspection);
    default:
      return [];
  }
}

export function allInspectionEmailRecords(inspection: Inspection): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const step of INSPECTION_EMAIL_STEPS) {
    records.push(...emailRecordsForStepOnly(inspection, step));
  }
  return dedupeJobCaseEmails(records);
}

export function inspectionEmailRecordsForStep(
  inspection: Inspection,
  step?: InspectionWorkflowEmailStep,
): JobCaseEmailRecord[] {
  const activeStep = step ?? resolveInspectionEmailStep(inspection.apiStatus);
  if (activeStep === 'published') {
    return allInspectionEmailRecords(inspection);
  }
  return dedupeJobCaseEmails(emailRecordsForStepOnly(inspection, activeStep));
}

/** Live case emails stamped on the inspection workflow meta (accept / report blast). */
export function inspectionCaseEmailRecords(
  record: InspectionRecord | null | undefined,
): JobCaseEmailRecord[] {
  return dedupeJobCaseEmails(enrichFieldInspectionCaseEmails(record));
}

/** Persisted workflow emails plus step-synthesized inspection notifications. */
export function inspectionJobCaseEmails(
  inspection: Inspection,
  record: InspectionRecord | null | undefined,
): JobCaseEmailRecord[] {
  return mergeJobCaseEmailSources(
    inspectionCaseEmailRecords(record),
    inspectionEmailRecordsForStep(inspection),
  );
}

export function inspectionWorkflowEmailStep(inspection: Inspection): InspectionWorkflowEmailStep {
  return resolveInspectionEmailStep(inspection.apiStatus);
}
