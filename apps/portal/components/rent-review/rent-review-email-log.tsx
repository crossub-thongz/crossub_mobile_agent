'use client';

import { JobCaseEmailLog, JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import type { CommSendDraft } from '@/components/agent/job-case-email-log';
import type { WorkflowEmailContact } from '@/lib/job-case-email-recipients';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';

export type RentReviewEmailRecord = JobCaseEmailRecord;

export function RentReviewEmailLog({
  title = 'E-mail',
  emails,
  onSend,
  enableComposeActions,
  recipientContacts,
}: {
  title?: string;
  emails: RentReviewEmailRecord[];
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
  recipientContacts?: WorkflowEmailContact[];
}) {
  return (
    <JobCaseEmailLog
      title={title}
      emails={emails}
      onSend={onSend}
      enableComposeActions={enableComposeActions}
      recipientContacts={recipientContacts}
    />
  );
}

export function RentReviewStageEmailHistory({
  emails,
  title,
  onSend,
  enableComposeActions,
  recipientContacts,
}: {
  emails: RentReviewEmailRecord[];
  title?: string;
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
  recipientContacts?: WorkflowEmailContact[];
}) {
  return (
    <JobCaseStageEmailHistory
      emails={emails}
      title={title}
      onSend={onSend}
      enableComposeActions={enableComposeActions}
      recipientContacts={recipientContacts}
    />
  );
}

export function RentReviewEmailRecordPanel({ email }: { email: RentReviewEmailRecord }) {
  return <RentReviewEmailLog emails={[email]} />;
}

export type { CommSendDraft };
