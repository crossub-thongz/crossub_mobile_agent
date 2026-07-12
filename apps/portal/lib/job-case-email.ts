/** Shared email record shape for job-case workflow history panels. */
export interface JobCaseEmailAttachment {
  name: string;
  /** Human-readable size, e.g. "245 KB" */
  sizeLabel?: string;
  /** MIME type for inline preview, e.g. application/pdf */
  mimeType?: string;
  /** BFF-relative URL to open or download the attachment */
  url?: string;
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
  /** Sender email when distinct from display `from` label. */
  fromEmail?: string;
  /** Recipient email when distinct from display `to` label. */
  toEmail?: string;
  attachments?: JobCaseEmailAttachment[];
  channel?: 'email' | 'message';
  /** Audit id of the email this message replies to or forwards. */
  inReplyToId?: string;
}

export function dedupeJobCaseEmails(records: JobCaseEmailRecord[]): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

export function mimeTypeForAttachmentFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}
