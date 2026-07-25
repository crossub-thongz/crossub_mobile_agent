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

/** Persisted workflow emails stamped on inspection / case workflow meta. */
export type PersistedCaseEmailRow = {
  id: string;
  subject: string;
  body: string;
  from: string;
  fromEmail?: string | null;
  to: string;
  toEmail?: string | null;
  at: string;
  kind: string;
};

export function persistedCaseEmailRecords(
  record: { caseEmails?: PersistedCaseEmailRow[] } | null | undefined,
): JobCaseEmailRecord[] {
  if (!record?.caseEmails?.length) return [];
  return record.caseEmails.map((row) => ({
    id: row.id,
    subject: row.subject,
    body: row.body,
    from: row.from,
    fromEmail: row.fromEmail ?? undefined,
    to: row.to,
    toEmail: row.toEmail ?? undefined,
    at: row.at,
    kind: row.kind,
  }));
}

/** Merge multiple email sources and collapse duplicate synthesized rows. */
export function mergeJobCaseEmailSources(
  ...sources: JobCaseEmailRecord[][]
): JobCaseEmailRecord[] {
  return dedupeJobCaseEmails(sources.flat());
}

export function dedupeJobCaseEmails(records: JobCaseEmailRecord[]): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }

  // Viewing-session + leasing-cycle merges can synthesize the same notification twice
  // (different ids, same kind/subject/time/recipient) — collapse those for display.
  const byContent = new Map<string, JobCaseEmailRecord>();
  for (const record of byId.values()) {
    const recipient = (record.toEmail ?? record.to).trim().toLowerCase();
    const key = `${record.kind ?? ''}|${record.subject}|${record.at}|${recipient}`;
    if (!byContent.has(key)) byContent.set(key, record);
  }

  return [...byContent.values()].sort((a, b) => b.at.localeCompare(a.at));
}

export function mimeTypeForAttachmentFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/** Fill missing attachment URLs when a resolver can derive a BFF path. */
export function enrichJobCaseEmailAttachments(
  attachments: JobCaseEmailAttachment[],
  resolveUrl?: (attachment: JobCaseEmailAttachment) => string | undefined,
): JobCaseEmailAttachment[] {
  return attachments.map((attachment) => {
    const mimeType = attachment.mimeType ?? mimeTypeForAttachmentFilename(attachment.name);
    if (attachment.url) return { ...attachment, mimeType };
    const url = resolveUrl?.(attachment);
    if (!url) return { ...attachment, mimeType };
    return { ...attachment, mimeType, url };
  });
}
