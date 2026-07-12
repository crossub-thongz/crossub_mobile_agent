'use client';

import { JobCaseEmailLog, JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import type { CommSendDraft } from '@/components/agent/job-case-email-log';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';

export type RentReviewEmailRecord = JobCaseEmailRecord;

export function RentReviewEmailLog({
  title = 'E-mail',
  emails,
  onSend,
  enableComposeActions,
}: {
  title?: string;
  emails: RentReviewEmailRecord[];
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
}) {
  return (
    <JobCaseEmailLog
      title={title}
      emails={emails}
      onSend={onSend}
      enableComposeActions={enableComposeActions}
    />
  );
}

export function RentReviewStageEmailHistory({
  emails,
  title,
  onSend,
  enableComposeActions,
}: {
  emails: RentReviewEmailRecord[];
  title?: string;
  onSend?: (draft: CommSendDraft) => void;
  enableComposeActions?: boolean;
}) {
  return (
    <JobCaseStageEmailHistory
      emails={emails}
      title={title}
      onSend={onSend}
      enableComposeActions={enableComposeActions}
    />
  );
}

export function RentReviewEmailRecordPanel({ email }: { email: RentReviewEmailRecord }) {
  return <RentReviewEmailLog emails={[email]} />;
}

export type { CommSendDraft };
