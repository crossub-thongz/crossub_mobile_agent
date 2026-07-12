/** Shared email record shape for job-case workflow history panels. */
export interface JobCaseEmailRecord {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  at: string;
  kind?: string;
}

export function dedupeJobCaseEmails(records: JobCaseEmailRecord[]): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}
