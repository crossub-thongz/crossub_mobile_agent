import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import {
  dedupeJobCaseEmails,
  mimeTypeForAttachmentFilename,
  type JobCaseEmailRecord,
} from '@/lib/job-case-email';
import { formatAgentSender } from '@/lib/job-case-email-sender';
import { resolveOnboardingTenant } from '@/lib/leasing/onboarding-display';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';

const CROSSUB_LEASING_FROM_EMAIL = 'leasing@crossub.com.au';

function normalizeEmail(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.includes('@') ? trimmed : undefined;
}

function crossubSender(): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  return { from: CROSSUB_LEASING_FROM_EMAIL, fromEmail: CROSSUB_LEASING_FROM_EMAIL };
}

function agentSender(detail: LeasingPropertyDetail): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  return formatAgentSender({
    name: detail.agentInfo.name,
    email: detail.agentInfo.email,
  });
}

function agentRecipient(detail: LeasingPropertyDetail): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const email = normalizeEmail(detail.agentInfo.email);
  if (email) return { to: email, toEmail: email };
  return { to: 'Managing Agent' };
}

function emailRecipient(value: string | undefined | null, fallback = '—'): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  const email = normalizeEmail(value);
  if (email) return { to: email, toEmail: email };
  const label = value?.trim();
  return { to: label || fallback };
}

function viewerInviteRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  return (detail.openReport.viewerInvites ?? [])
    .filter((invite) => invite.channel === 'email' && invite.email?.trim())
    .map((invite) => ({
      id: invite.id,
      subject: 'Open inspection invitation',
      body: invite.body,
      ...agentSender(detail),
      ...emailRecipient(invite.email),
      at: invite.sentAt,
      kind: 'viewer_invite',
    }));
}

function openReportToAgentRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  if (!detail.openReport.sentToAgent || !detail.openReport.sentToAgentAt) return null;
  const attendeeCount = detail.openReport.attendeeCount ?? 0;
  return {
    id: `${detail.propertyId}-open-report-agent`,
    subject: `Open inspection report — ${detail.propertyAddress}`,
    body: [
      'CROSSUB has completed the open inspection report for your review.',
      '',
      'Property',
      `Address: ${detail.propertyAddress}`,
      `Attendees recorded: ${attendeeCount}`,
      '',
      'Please open the agent portal → Open Report to review attendee notes and continue with applications.',
      'Reply to this thread if you need CROSSUB to follow up with any attendees.',
    ].join('\n'),
    ...crossubSender(),
    ...agentRecipient(detail),
    at: detail.openReport.sentToAgentAt,
    kind: 'open_report_agent',
  };
}

function tenantRecipient(
  tenant: LeasingApplicationDetail | null,
): Pick<JobCaseEmailRecord, 'to' | 'toEmail'> {
  if (!tenant) return { to: '[Tenant] Tenant' };
  const email = normalizeEmail(tenant.email);
  const name = tenant.applicant?.trim() || 'Tenant';
  if (email) {
    return { to: `[Tenant] ${name}`, toEmail: email };
  }
  return { to: `[Tenant] ${name}` };
}

function formatMoneyAud(value?: number | null): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `$${value.toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function applicationFeedbackRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  return detail.applicationsDetail
    .filter((app) => app.feedbackSentAt && app.feedback?.trim())
    .map((app) => ({
      id: `${app.id}-feedback`,
      subject: `Application feedback — ${detail.propertyAddress}`,
      body: app.feedback ?? '',
      ...agentSender(detail),
      ...emailRecipient(app.email, app.applicant),
      at: app.feedbackSentAt!,
      kind: 'application_feedback',
    }));
}

function buildBondLinkEmailBody(detail: LeasingPropertyDetail, tenant: LeasingApplicationDetail | null): string {
  const who = tenant?.applicant?.trim() || 'there';
  const bond = detail.onboarding.bond;
  const amount = formatMoneyAud(bond.amount ?? detail.rental.bond);
  const lines = [
    `Hi ${who},`,
    '',
    `Please pay the bond for ${detail.propertyAddress} to continue onboarding.`,
  ];
  if (amount) lines.push('', `Bond amount: ${amount}`);
  if (bond.agentLink?.trim()) {
    lines.push('', 'Secure payment link:', bond.agentLink.trim());
  } else {
    lines.push('', 'Your managing agent has sent a bond payment link — open it from this email or the tenant portal.');
  }
  if (bond.lodgementRef?.trim()) {
    lines.push('', `Bond reference: ${bond.lodgementRef.trim()}`);
  }
  lines.push(
    '',
    'After paying, upload your payment proof in the CROSSUB tenant portal so we can confirm receipt.',
    '',
    '— Your managing agent',
  );
  return lines.join('\n');
}

function buildLeaseAgreementSentBody(
  detail: LeasingPropertyDetail,
  tenant: LeasingApplicationDetail | null,
): string {
  const who = tenant?.applicant?.trim() || 'there';
  const agreement = detail.onboarding.agreement;
  const contract = agreement.contract;
  const lines = [
    `Hi ${who},`,
    '',
    `Your lease agreement for ${detail.propertyAddress} is ready for signing.`,
    '',
    'Lease summary',
  ];
  const rent = formatMoneyAud(contract.weeklyRent ?? detail.rental.rentPerWeek);
  if (rent) lines.push(`Weekly rent: ${rent}`);
  if (contract.leaseTerm?.trim() || detail.rental.leaseTerm?.trim()) {
    lines.push(`Lease term: ${(contract.leaseTerm || detail.rental.leaseTerm || '').trim()}`);
  }
  if (contract.startDate) lines.push(`Start date: ${formatAuDate(contract.startDate)}`);
  const bond = formatMoneyAud(contract.bond ?? detail.rental.bond);
  if (bond) lines.push(`Bond: ${bond}`);
  lines.push(
    '',
    'Please sign in to the CROSSUB tenant portal → Onboarding → Lease agreement to review and sign.',
    agreement.uploadedFileName
      ? `Document on file: ${agreement.uploadedFileName}`
      : 'The agreement PDF is available in the portal once you open the signing step.',
    '',
    '— Your managing agent',
  );
  return lines.join('\n');
}

function buildSignedLeaseAgreementBody(
  detail: LeasingPropertyDetail,
  tenant: LeasingApplicationDetail | null,
): string {
  const who = tenant?.applicant?.trim() || 'there';
  const agreement = detail.onboarding.agreement;
  const fileName = agreement.signedProofFileName?.trim() || 'signed-tenancy-agreement.pdf';
  return [
    `Hi ${who},`,
    '',
    `Thank you — your lease agreement for ${detail.propertyAddress} has been signed.`,
    '',
    'A copy of the signed agreement is attached to this email for your records.',
    `Attached: ${fileName}`,
    '',
    'You can also download the signed PDF anytime from the CROSSUB tenant portal (Onboarding → Lease agreement).',
    '',
    'Next steps: complete any outstanding deposit/bond proofs and confirm key collection details in the portal.',
    '',
    '— CROSSUB Leasing',
  ].join('\n');
}

function onboardingEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  const tenant = resolveOnboardingTenant(detail);
  const tenantTo = tenantRecipient(tenant);

  if (detail.onboarding.bond.sentToTenantAt) {
    records.push({
      id: `${detail.propertyId}-bond-link`,
      subject: `Bond lodgement — ${detail.propertyAddress}`,
      body: buildBondLinkEmailBody(detail, tenant),
      ...agentSender(detail),
      ...tenantTo,
      at: detail.onboarding.bond.sentToTenantAt,
      kind: 'bond_link',
    });
  }

  const signing = detail.onboarding.agreement.signingStatus;
  if (signing !== 'not_sent') {
    const sentAt =
      detail.timeline.find((e) => /contract sent for e-signature|agreement sent|contract uploaded/i.test(e.label))
        ?.at ??
      detail.onboarding.bond.sentToTenantAt ??
      detail.onboarding.agreement.signedAt ??
      '';
    records.push({
      id: `${detail.propertyId}-lease-agreement-sent`,
      subject: `Lease agreement — ${detail.propertyAddress}`,
      body: buildLeaseAgreementSentBody(detail, tenant),
      ...agentSender(detail),
      ...tenantTo,
      at: sentAt,
      kind: 'lease_agreement',
    });
  }

  const signedAt =
    detail.onboarding.agreement.signedAt ||
    detail.timeline.find((e) => /signed lease agreement emailed|recorded lease agreement signing|uploaded signed lease/i.test(e.label))
      ?.at ||
    '';
  if (
    (signing === 'signed' || signing === 'viewed' || Boolean(detail.onboarding.agreement.signedProofUrl)) &&
    signedAt
  ) {
    const fileName =
      detail.onboarding.agreement.signedProofFileName?.trim() || 'signed-tenancy-agreement.pdf';
    records.push({
      id: `${detail.propertyId}-lease-agreement-signed`,
      subject: `Signed lease agreement — ${detail.propertyAddress}`,
      body: buildSignedLeaseAgreementBody(detail, tenant),
      ...crossubSender(),
      ...tenantTo,
      at: signedAt,
      kind: 'lease_agreement_signed',
      attachments: detail.onboarding.agreement.signedProofUrl
        ? [
            {
              name: fileName,
              mimeType: mimeTypeForAttachmentFilename(fileName),
              url: detail.onboarding.agreement.signedProofUrl,
            },
          ]
        : undefined,
    });
  }

  return records.filter((record) => record.at);
}

function formatAuDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', { dateStyle: 'medium' });
}

function formatAuTime(value: string): string {
  return new Date(value).toLocaleString('en-AU', { timeStyle: 'short' });
}

function formatAuDateTime(value: string): string {
  return new Date(value).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

function buildOpenInspectionScheduledEmailBody(detail: LeasingPropertyDetail): string {
  const oi = detail.openInspection;
  const rental = detail.rental;
  const propertyLines = [`Address: ${detail.propertyAddress}`];
  if (rental.rentPerWeek != null) {
    propertyLines.push(
      `Rent: $${rental.rentPerWeek.toLocaleString('en-AU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}/week`,
    );
  }
  if (rental.availableFrom) propertyLines.push(`Available from: ${formatAuDate(rental.availableFrom)}`);
  if (rental.leaseTerm?.trim()) propertyLines.push(`Lease term: ${rental.leaseTerm.trim()}`);
  if (rental.deposit != null) {
    propertyLines.push(`Deposit: $${rental.deposit.toLocaleString('en-AU')}`);
  }
  if (rental.bond != null) {
    propertyLines.push(`Bond: $${rental.bond.toLocaleString('en-AU')}`);
  }
  if (rental.lettingNotes?.trim()) propertyLines.push(`Notes: ${rental.lettingNotes.trim()}`);

  const scheduleLines: string[] = [];
  if (oi.scheduledTime) {
    scheduleLines.push(`Date: ${formatAuDate(oi.scheduledTime)}`);
    scheduleLines.push(`Start: ${formatAuTime(oi.scheduledTime)}`);
    if (oi.scheduledTimeEnd) {
      scheduleLines.push(`End: ${formatAuTime(oi.scheduledTimeEnd)}`);
      scheduleLines.push(
        `Window: ${formatAuDateTime(oi.scheduledTime)} – ${formatAuTime(oi.scheduledTimeEnd)}`,
      );
    } else {
      scheduleLines.push(`Scheduled: ${formatAuDateTime(oi.scheduledTime)}`);
    }
  }

  return [
    'An open inspection has been scheduled for a property in your portfolio.',
    '',
    'Property details',
    propertyLines.join('\n'),
    '',
    'Open inspection',
    scheduleLines.join('\n'),
    '',
    'Please find tenants for this listing and submit applicants back to CROSSUB when ready.',
    'You can track progress under Open Report (step 2) in the leasing workflow.',
  ].join('\n');
}

function openInspectionScheduledRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  const oi = detail.openInspection;
  if (!oi.scheduledTime) return null;
  return {
    id: `${detail.propertyId}-open-inspection-scheduled`,
    subject: `Open inspection scheduled — ${detail.propertyAddress}`,
    body: buildOpenInspectionScheduledEmailBody(detail),
    ...crossubSender(),
    ...agentRecipient(detail),
    at: oi.scheduledTime,
    kind: 'open_inspection_scheduled',
  };
}

function openInspectionPreferenceRecord(detail: LeasingPropertyDetail): JobCaseEmailRecord | null {
  const oi = detail.openInspection;
  if (oi.scheduledTime || !oi.preferredScheduledTime) return null;

  const lines = [
    `Your open inspection request has been received for ${detail.propertyAddress}.`,
    '',
    'Preferred viewing window',
    `Start: ${formatAuDateTime(oi.preferredScheduledTime)}`,
  ];
  if (oi.preferredScheduledTimeEnd) {
    lines.push(`End: ${formatAuTime(oi.preferredScheduledTimeEnd)}`);
  }
  if (oi.preferredNotes?.trim()) {
    lines.push('', `Notes: ${oi.preferredNotes.trim()}`);
  }
  lines.push('', 'CROSSUB will confirm the official schedule and email you the property details.');

  return {
    id: `${detail.propertyId}-open-inspection-preference`,
    subject: 'Open inspection request received',
    body: lines.join('\n'),
    ...crossubSender(),
    ...agentRecipient(detail),
    at: oi.preferredScheduledTime,
    kind: 'open_inspection_preference',
  };
}

/** Fill missing agent addresses on synthesized leasing mail (cycle view may omit agent email). */
export function enrichLeasingEmailRecords(
  records: JobCaseEmailRecord[],
  fallbackAgentEmail?: string | null,
  fallbackAgentName?: string | null,
): JobCaseEmailRecord[] {
  const agentEmail = normalizeEmail(fallbackAgentEmail);

  return records.map((record) => {
    const next = { ...record };
    const fromLower = next.from.trim().toLowerCase();
    const isBareAgent =
      fromLower === 'managing agent' ||
      fromLower === '[agent] managing agent' ||
      (!next.fromEmail && fromLower.startsWith('[agent]') && !next.from.includes('@'));

    if (isBareAgent || (next.from.startsWith('[Agent]') && !next.fromEmail && agentEmail)) {
      Object.assign(
        next,
        formatAgentSender({
          name: fallbackAgentName ?? next.from.replace(/^\[Agent\]\s*/i, ''),
          email: agentEmail ?? next.fromEmail,
        }),
      );
    }
    if (!next.toEmail && next.to.trim().toLowerCase() === 'managing agent' && agentEmail) {
      next.to = agentEmail;
      next.toEmail = agentEmail;
    }
    return next;
  });
}

export function openInspectionJobCaseEmails(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  return dedupeJobCaseEmails([
    ...openInspectionArrangementEmailRecords(detail),
    ...openReportPhaseEmailRecords(detail),
  ]);
}

function openInspectionArrangementEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  const scheduled = openInspectionScheduledRecord(detail);
  if (scheduled) records.push(scheduled);
  const preference = openInspectionPreferenceRecord(detail);
  if (preference) records.push(preference);
  return records;
}

function openReportPhaseEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records = viewerInviteRecords(detail);
  const agentReport = openReportToAgentRecord(detail);
  if (agentReport) records.push(agentReport);
  return records;
}

function emailRecordsForStepOnly(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): JobCaseEmailRecord[] {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      return openInspectionArrangementEmailRecords(detail);
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return openReportPhaseEmailRecords(detail);
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

/** Emails from earlier lifecycle phases that should stay visible on later steps. */
function priorPhaseEmailRecords(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): JobCaseEmailRecord[] {
  const order = [
    LEASING_LIFECYCLE_STEP.OPEN_INSPECTION,
    LEASING_LIFECYCLE_STEP.OPEN_REPORT,
    LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
    LEASING_LIFECYCLE_STEP.RESULTS,
    LEASING_LIFECYCLE_STEP.ONBOARDING,
  ];
  const stepIndex = order.indexOf(step);
  if (stepIndex <= 0) return [];

  const records: JobCaseEmailRecord[] = [];
  for (let i = 0; i < stepIndex; i += 1) {
    records.push(...emailRecordsForStepOnly(detail, order[i]!));
  }
  return records;
}

export function allLeasingEmailRecords(detail: LeasingPropertyDetail): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const step of Object.values(LEASING_LIFECYCLE_STEP)) {
    records.push(...emailRecordsForStepOnly(detail, step));
  }
  return dedupeJobCaseEmails(records);
}

/** Cumulative email history for a lifecycle step (this step + every earlier phase). */
export function leasingEmailRecordsForStep(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): JobCaseEmailRecord[] {
  if (step === LEASING_LIFECYCLE_STEP.ONBOARDING) {
    return allLeasingEmailRecords(detail);
  }
  return dedupeJobCaseEmails([
    ...priorPhaseEmailRecords(detail, step),
    ...emailRecordsForStepOnly(detail, step),
  ]);
}
