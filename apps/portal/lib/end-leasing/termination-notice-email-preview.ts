import {
  TERMINATION_NOTICE_GROUND,
  TERMINATION_NOTICE_GROUND_LABEL,
  type TerminationNoticeGround,
} from '@/constants/end-leasing';

function formatDateMedium(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type TerminationNoticeEmailVariant = 'non_payment' | 'breach' | 'other';

export interface TerminationNoticeEmailPreviewInput {
  propertyAddress: string;
  tenantName?: string | null;
  agentName?: string | null;
  ground: TerminationNoticeGround | string | null;
  terminationDate: string | null;
  noticePeriodDays?: number | null;
  terminationReason?: string | null;
  breachClause?: string | null;
  breachConduct?: string | null;
}

function tenantSalutation(name: string | null | undefined): string {
  const who = name?.trim();
  return who ? `Dear ${who},` : 'Dear tenant(s),';
}

function signOff(agentName: string | null | undefined): string {
  return ['', 'Kind regards,', agentName?.trim() || 'Your property management team'].join('\n');
}

function terminationDateLabel(iso: string | null): string {
  if (!iso) return '[Insert Termination Date]';
  return formatDateMedium(iso);
}

function buildNonPaymentBody(input: TerminationNoticeEmailPreviewInput): string {
  const dateLabel = terminationDateLabel(input.terminationDate);
  return [
    tenantSalutation(input.tenantName),
    '',
    'Our records show that your rent was paid up to [DATE] and is now [how many] days overdue.',
    '',
    'Due to this, we hereby issue you a 14-day Termination Notice due to Non-payment of Rent Notice attached.',
    '',
    `Vacant possession is expected on or before the termination date stipulated on the notice (${dateLabel}).`,
    '',
    'If payment is made in full, and your arrears are cleared in full, we may void the termination notice.',
    '',
    'Please feel free to reach out to me if you have any questions.',
    signOff(input.agentName),
  ].join('\n');
}

function buildBreachBody(input: TerminationNoticeEmailPreviewInput): string {
  const tenant = input.tenantName?.trim() || 'Tenant';
  const address = input.propertyAddress.trim() || 'the property';
  const dateLabel = terminationDateLabel(input.terminationDate);
  const noticeDays = input.noticePeriodDays ?? 14;
  const breachName =
    input.breachClause?.trim() || input.breachConduct?.trim() || '[Insert Brief Name of Breach]';
  const breachDetail =
    input.breachConduct?.trim() ||
    input.breachClause?.trim() ||
    '[Provide a clear 1-2 sentence description of the issue here.]';
  const sectionRef = input.breachClause?.trim()
    ? `"${input.breachClause.trim()}"`
    : '"[Insert Specific Section Name]"';

  return [
    `Dear ${tenant},`,
    '',
    'I hope you are doing well.',
    '',
    `We are writing to provide you with formal notice of the termination of your residential tenancy agreement for ${address}, effective ${dateLabel}, in line with the required ${noticeDays} days' notice period.`,
    '',
    'This notice is issued under the NSW Residential Tenancies Act 2010 due to a breach of your lease agreement.',
    '',
    `Specifically, you have failed to comply with the terms of your contract regarding ${breachName}. As specified in the ${sectionRef} section on page [Insert Page Number] of your signed agreement:`,
    '',
    `Details of the breach: ${breachDetail}`,
    '',
    'We request that this matter be treated as urgent. [Insert Required Action] immediately.',
    '',
    'Thank you for your understanding and cooperation.',
    signOff(input.agentName),
  ].join('\n');
}

function buildOtherBody(input: TerminationNoticeEmailPreviewInput): string {
  const address = input.propertyAddress.trim() || 'the property';
  const dateLabel = terminationDateLabel(input.terminationDate);
  const noticeDays = input.noticePeriodDays ?? 90;
  const ground = input.ground as TerminationNoticeGround | null;
  const reason =
    input.terminationReason?.trim() ||
    (ground ? TERMINATION_NOTICE_GROUND_LABEL[ground] : null) ||
    '[reason of termination]';

  return [
    'Dear tenant(s),',
    '',
    "I hope you're doing well.",
    '',
    `We're writing to inform you that, we must provide formal notice of the termination of your lease agreement for ${address}, effective ${dateLabel}, in line with the required ${noticeDays}-day notice period.`,
    '',
    `This decision has not been made lightly. Unfortunately, due to ${reason}, we are in a position where we need to bring the current lease to an end. We truly understand that this may come as unexpected news, and we're very sorry for any inconvenience or disruption this may cause.`,
    '',
    `As per the lease agreement, we kindly ask that the property be vacated, and all keys returned by ${dateLabel}. Please note that because you have been served this notice, you have the right to vacate earlier by providing us with 14 days' written notice.`,
    '',
    'Any remaining rent or matters related to the condition of the property will be handled according to the lease terms and applicable laws. Our team will reach out to arrange a final inspection at a time that\'s convenient for you.',
    '',
    "Please know that we're here to support you during this transition. If you have any questions, need clarification, or require assistance with the moving process, don't hesitate to contact us, we'll do our best to help.",
    '',
    'Thank you for your understanding and cooperation.',
    signOff(input.agentName),
  ].join('\n');
}

export function emailVariantForGround(
  ground: TerminationNoticeGround | string | null,
): TerminationNoticeEmailVariant {
  if (ground === TERMINATION_NOTICE_GROUND.NON_PAYMENT) return 'non_payment';
  if (ground === TERMINATION_NOTICE_GROUND.BREACH) return 'breach';
  return 'other';
}

export function buildTerminationNoticeEmailPreview(
  input: TerminationNoticeEmailPreviewInput,
): string {
  const variant =
    (input.ground ? emailVariantForGround(input.ground) : null) ??
    ('other' as TerminationNoticeEmailVariant);

  switch (variant) {
    case 'non_payment':
      return buildNonPaymentBody(input);
    case 'breach':
      return buildBreachBody(input);
    default:
      return buildOtherBody(input);
  }
}
