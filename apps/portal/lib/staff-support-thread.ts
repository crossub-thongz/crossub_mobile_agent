import type { MessageThread } from '@/lib/types';

/** Prefix for agent → CROSSUB staff support threads (routed to admin Communication Hub). */
export const STAFF_SUPPORT_SUBJECT_PREFIX = 'CROSSUB Support — ';

export type StaffCaseContext = {
  caseType:
    | 'MAINTENANCE'
    | 'INSPECTION'
    | 'LEASING'
    | 'RENT_REVIEW'
    | 'TRIBUNAL'
    | 'PROPERTY';
  caseId: string;
  label: string;
};

export function staffSupportSubject(propertyAddress: string): string {
  return `${STAFF_SUPPORT_SUBJECT_PREFIX}${propertyAddress}`;
}

export function isStaffSupportThread(thread: Pick<MessageThread, 'subject'>): boolean {
  return thread.subject.startsWith(STAFF_SUPPORT_SUBJECT_PREFIX);
}

/** First message body — includes ids staff can use in the admin portal / comm hub. */
export function buildStaffSupportContextBody(args: {
  propertyAddress: string;
  propertyId: string;
  case?: StaffCaseContext;
}): string {
  const lines = [
    'Context shared from the agent app:',
    '',
    `Property: ${args.propertyAddress}`,
    `Property ID: ${args.propertyId}`,
  ];

  if (args.case && args.case.caseType !== 'PROPERTY') {
    lines.push(`Case: ${args.case.label}`);
    lines.push(`Case type: ${args.case.caseType}`);
    lines.push(`Case ID: ${args.case.caseId}`);
  }

  lines.push(
    '',
    'Staff: open Communication Hub → Property Communications to view this property and thread.',
    '---',
    '',
    'How can we help?',
  );

  return lines.join('\n');
}

export function findStaffSupportThread(
  messages: MessageThread[],
  propertyId: string,
  caseContext?: StaffCaseContext,
): MessageThread | undefined {
  return messages.find(
    (m) =>
      m.propertyId === propertyId &&
      isStaffSupportThread(m) &&
      (caseContext ? m.relatedCaseId === caseContext.caseId : !m.relatedCaseId),
  );
}

export function maintenanceStaffCase(args: {
  requestId: string;
  label: string;
}): StaffCaseContext {
  return {
    caseType: 'MAINTENANCE',
    caseId: args.requestId,
    label: args.label,
  };
}

export function rentReviewStaffCase(args: {
  reviewId: string;
  label: string;
}): StaffCaseContext {
  return {
    caseType: 'RENT_REVIEW',
    caseId: args.reviewId,
    label: args.label,
  };
}
