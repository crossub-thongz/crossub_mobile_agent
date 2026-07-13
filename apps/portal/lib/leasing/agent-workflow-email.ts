import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

function viewerInviteRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  return (detail.openReport.viewerInvites ?? [])
    .filter((invite) => invite.channel === 'email' && invite.email?.trim())
    .map((invite) => ({
      id: invite.id,
      subject: 'Open inspection invitation',
      body: invite.body,
      from: detail.agentInfo.email ?? 'Managing Agent',
      to: invite.email ?? '—',
      at: invite.sentAt,
      kind: 'viewer_invite',
    }));
}

function openReportToAgentRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  if (!detail.openReport.sentToAgent || !detail.openReport.sentToAgentAt) return null;
  return {
    id: `${detail.propertyId}-open-report-agent`,
    subject: `Open inspection report — ${detail.propertyAddress}`,
    body: `Open inspection report sent to agent for review.\n\nAttendees: ${detail.openReport.attendeeCount ?? 0}`,
    from: 'CROSSUB',
    to: detail.agentInfo.email ?? 'Managing Agent',
    at: detail.openReport.sentToAgentAt,
    kind: 'open_report_agent',
  };
}

function applicationFeedbackRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  return detail.applicationsDetail
    .filter((app) => app.feedbackSentAt && app.feedback?.trim())
    .map((app) => ({
      id: `${app.id}-feedback`,
      subject: `Application feedback — ${detail.propertyAddress}`,
      body: app.feedback ?? '',
      from: detail.agentInfo.email ?? 'Managing Agent',
      to: app.email ?? app.applicant,
      at: app.feedbackSentAt!,
      kind: 'application_feedback',
    }));
}

function onboardingEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  if (detail.onboarding.bond.sentToTenantAt) {
    records.push({
      id: `${detail.propertyId}-bond-link`,
      subject: `Bond lodgement — ${detail.propertyAddress}`,
      body: 'Bond payment link sent to tenant.',
      from: detail.agentInfo.email ?? 'Managing Agent',
      to: 'Tenant',
      at: detail.onboarding.bond.sentToTenantAt,
      kind: 'bond_link',
    });
  }
  if (detail.onboarding.agreement.signingStatus !== 'not_sent') {
    records.push({
      id: `${detail.propertyId}-lease-agreement`,
      subject: `Lease agreement — ${detail.propertyAddress}`,
      body: `Lease agreement signing status: ${detail.onboarding.agreement.signingStatus}.`,
      from: detail.agentInfo.email ?? 'Managing Agent',
      to: 'Tenant',
      at: detail.onboarding.agreement.signedAt ?? detail.onboarding.bond.sentToTenantAt ?? '',
      kind: 'lease_agreement',
    });
  }
  return records.filter((record) => record.at);
}

function openInspectionPushRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  if (!detail.openInspection.pushedToAgentApp || !detail.openInspection.scheduledTime) {
    return null;
  }
  const scheduled = detail.openInspection.scheduledTime;
  const rental = detail.rental;
  const lines = [
    `Address: ${detail.propertyAddress}`,
    rental.rentPerWeek ? `Rent: $${rental.rentPerWeek}/week` : null,
    rental.availableFrom
      ? `Available from: ${new Date(rental.availableFrom).toLocaleDateString('en-AU')}`
      : null,
    rental.leaseTerm ? `Lease term: ${rental.leaseTerm}` : null,
    `Scheduled: ${new Date(scheduled).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`,
    '',
    'Please find tenants for this listing and submit applicants back to CROSSUB when ready.',
  ].filter((line): line is string => line != null);

  return {
    id: `${detail.propertyId}-open-inspection-push`,
    subject: `Open inspection scheduled — ${detail.propertyAddress}`,
    body: lines.join('\n'),
    from: 'CROSSUB Leasing',
    to: detail.agentInfo.email ?? 'Managing Agent',
    at: scheduled,
    kind: 'open_inspection_push',
  };
}

function openInspectionPreferenceRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  const oi = detail.openInspection;
  if (oi.scheduledTime || !oi.preferredScheduledTime) return null;
  return {
    id: `${detail.propertyId}-open-inspection-preference`,
    subject: 'OPEN inspection scheduled',
    body: `Open inspection preference submitted for ${detail.propertyAddress}.`,
    from: 'CROSSUB',
    to: detail.agentInfo.email ?? 'Managing Agent',
    at: oi.preferredScheduledTime,
    kind: 'open_inspection_preference',
  };
}

export function openInspectionJobCaseEmails(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  const push = openInspectionPushRecord(detail);
  if (push) records.push(push);
  const preference = openInspectionPreferenceRecord(detail);
  if (preference) records.push(preference);
  const agentReport = openReportToAgentRecord(detail);
  if (agentReport) records.push(agentReport);
  records.push(...viewerInviteRecords(detail));
  return dedupeJobCaseEmails(records);
}

function emailRecordsForStepOnly(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): JobCaseEmailRecord[] {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION: {
      const push = openInspectionPushRecord(detail);
      return push ? [push] : [];
    }
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT: {
      const records = viewerInviteRecords(detail);
      const agentReport = openReportToAgentRecord(detail);
      if (agentReport) records.push(agentReport);
      return records;
    }
    case LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL:
      return [];
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return applicationFeedbackRecords(detail);
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return onboardingEmailRecords(detail);
    default:
      return [];
  }
}

export function allLeasingEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const step of Object.values(LEASING_LIFECYCLE_STEP)) {
    records.push(...emailRecordsForStepOnly(detail, step));
  }
  return dedupeJobCaseEmails(records);
}

export function leasingEmailRecordsForStep(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): JobCaseEmailRecord[] {
  if (step === LEASING_LIFECYCLE_STEP.ONBOARDING) {
    return allLeasingEmailRecords(detail);
  }
  return dedupeJobCaseEmails(emailRecordsForStepOnly(detail, step));
}
