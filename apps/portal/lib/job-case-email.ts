/** Shared email record shape for job-case workflow history panels. */
export interface JobCaseEmailAttachment {
  name: string;
  /** Human-readable size, e.g. "245 KB" */
  sizeLabel?: string;
}

/** Shared email record shape for job-case workflow history panels. */
export interface JobCaseEmailRecord {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  at: string;
  kind?: string;
  /** Recipient email when distinct from display `to` label. */
  toEmail?: string;
  attachments?: JobCaseEmailAttachment[];
  channel?: 'email' | 'message';
}

export function dedupeJobCaseEmails(records: JobCaseEmailRecord[]): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}
