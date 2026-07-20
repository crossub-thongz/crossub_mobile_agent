import { RENT_RESEARCH_PLATFORMS } from '@/lib/rent-review/agent-workflow-model';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import type { JobCaseEmailAttachment } from '@/lib/job-case-email';
import { formatCurrency } from '@/lib/utils';

export interface LandlordResearchEmailDraft {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  attachments: JobCaseEmailAttachment[];
}

export function resolveLandlordContact(
  landlordName?: string | null,
  landlordEmail?: string | null,
): { name: string; email: string } {
  return {
    name:
      landlordName?.trim() && landlordName.trim() !== '—' ? landlordName.trim() : 'Landlord',
    email: landlordEmail?.trim() || '',
  };
}

/** AI-drafted email for landlord confirmation of rent research. */
export function buildLandlordResearchEmailDraft(
  detail: RentReviewWorkflowDetail,
  landlordName: string,
  landlordEmail: string,
): LandlordResearchEmailDraft {
  const suggested =
    detail.ai.suggestedWeekly ?? detail.proposedWeeklyRent ?? detail.currentWeeklyRent;
  const pct = detail.ai.increasePercent;
  const increaseLine =
    pct != null
      ? `a recommended increase of ${pct}% to ${formatCurrency(suggested)} per week`
      : `a recommended rent of ${formatCurrency(suggested)} per week`;

  const body =
    `Dear ${landlordName},\n\n` +
    `We have completed the market rent research for your property at ${detail.propertyAddress} ` +
    `(tenant: ${detail.tenantName}).\n\n` +
    `Our research across ${RENT_RESEARCH_PLATFORMS.join(', ')} indicates ${increaseLine}, ` +
    `compared with the current rent of ${formatCurrency(detail.currentWeeklyRent)} per week.\n\n` +
    `${detail.ai.rationale ?? 'Comparable lettings in the area support the recommended figure.'}\n\n` +
    `Please find attached:\n` +
    `• CROSSUB Rent Review Report\n` +
    `• NSW Fair Trading rent increase reference\n\n` +
    `Kindly review the attached materials and reply to confirm whether you approve proceeding with ` +
    `this recommended rent, or let us know if you would like to discuss further.\n\n` +
    `Kind regards,\n` +
    `Your managing agent (sent from the Agent portal)`;

  return {
    toEmail: landlordEmail,
    toName: landlordName,
    subject: `Rent review research — ${detail.propertyAddress}`,
    body,
    attachments: defaultResearchAttachments(),
  };
}

export function defaultResearchAttachments(): JobCaseEmailAttachment[] {
  return [
    { name: 'CROSSUB-Rent-Review-Report.pdf', sizeLabel: '~120 KB' },
    { name: 'NSW-Fair-Trading-Reference.pdf', sizeLabel: '~85 KB' },
  ];
}

export function buildResearchReportHtml(detail: RentReviewWorkflowDetail): string {
  const suggested =
    detail.ai.suggestedWeekly ?? detail.proposedWeeklyRent ?? detail.currentWeeklyRent;
  const pct =
    detail.ai.increasePercent ??
    (detail.currentWeeklyRent > 0
      ? Math.round(((suggested - detail.currentWeeklyRent) / detail.currentWeeklyRent) * 1000) / 10
      : null);

  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Rent Review Report</title>
<style>
  body{font-family:system-ui,sans-serif;margin:40px;color:#111;line-height:1.5;font-size:13px;}
  h1{font-size:20px;margin:0 0 12px;}
  table{width:100%;border-collapse:collapse;margin:12px 0;}
  td,th{border:1px solid #ddd;padding:8px;text-align:left;}
  th{background:#f5f5f5;width:35%;}
</style>
</head>
<body>
<h1>CROSSUB Rent Review Report</h1>
<p><strong>Property:</strong> ${escape(detail.propertyAddress)}</p>
<p><strong>Tenant:</strong> ${escape(detail.tenantName)}</p>
<p><strong>Sources:</strong> ${escape(RENT_RESEARCH_PLATFORMS.join(', '))}</p>
<table>
<tr><th>Current rent</th><td>${escape(formatCurrency(detail.currentWeeklyRent))}/week</td></tr>
<tr><th>Recommended rent</th><td>${escape(formatCurrency(suggested))}/week</td></tr>
<tr><th>Change</th><td>${pct != null ? `${pct}%` : '—'}</td></tr>
</table>
<h2>Analysis</h2>
<p>${escape(detail.ai.rationale ?? 'Comparable market analysis complete.')}</p>
</body>
</html>`;
}
