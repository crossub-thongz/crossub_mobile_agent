'use client';

import { JobCaseEmailLog, JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';

export type RentReviewEmailRecord = JobCaseEmailRecord;

export function RentReviewEmailLog({
  title = 'E-mail',
  emails,
}: {
  title?: string;
  emails: RentReviewEmailRecord[];
}) {
  return <JobCaseEmailLog title={title} emails={emails} />;
}

export function RentReviewStageEmailHistory({
  emails,
  title,
}: {
  emails: RentReviewEmailRecord[];
  title?: string;
}) {
  return <JobCaseStageEmailHistory emails={emails} title={title} />;
}

export function RentReviewEmailRecordPanel({ email }: { email: RentReviewEmailRecord }) {
  return <RentReviewEmailLog emails={[email]} />;
}
