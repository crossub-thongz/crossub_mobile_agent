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

function extractRecipientEmail(record: JobCaseEmailRecord): string {
  const direct = record.toEmail?.trim().toLowerCase();
  if (direct?.includes('@')) return direct;
  const embedded = record.to.match(/[\w.+-]+@[\w.-]+\.\w+/i)?.[0];
  if (embedded) return embedded.toLowerCase();
  return record.to.trim().toLowerCase();
}

function normalizeDedupeSubject(subject: string): string {
  const trimmed = subject.trim();
  const openReport = /^open inspection report — (.+)$/i.exec(trimmed);
  if (openReport) {
    const street =
      openReport[1].split(',')[0]?.trim().toLowerCase() ??
      openReport[1].trim().toLowerCase();
    return `open inspection report — ${street}`;
  }
  return trimmed.toLowerCase();
}

function isAgentRoleRecipient(record: JobCaseEmailRecord): boolean {
  const hay = `${record.to} ${record.toEmail ?? ''}`.toLowerCase();
  return hay.includes('agent') || hay.includes('account manager');
}

function semanticDedupeKey(record: JobCaseEmailRecord): string | null {
  const kind = record.kind ?? '';
  const recipient = extractRecipientEmail(record);
  const subject = normalizeDedupeSubject(record.subject);

  if (
    (kind === 'open_report_agent' || kind === 'open_inspection_report') &&
    isAgentRoleRecipient(record)
  ) {
    return `open-report-agent|${subject}|${recipient}`;
  }

  if (kind === 'open_inspection_scheduled') {
    return `open-inspection-scheduled|${subject}|${recipient}`;
  }

  if (
    kind === 'notification' ||
    kind === 'audit_email' ||
    /email|emailed|sent|notice|rfq|quote|invoice|responsibility/i.test(kind)
  ) {
    const day = record.at.slice(0, 10);
    return `maintenance-outbound|${subject}|${recipient}|${day}`;
  }

  return null;
}

function emailRecordQuality(record: JobCaseEmailRecord): number {
  let score = 0;
  if (record.attachments?.length) score += 20;
  if (record.kind === 'open_report_agent') score += 10;
  if (record.fromEmail?.includes('no-reply') || /crossub/i.test(record.from)) score += 5;
  if (record.toEmail?.includes('@')) score += 2;
  if (record.body.trim().length > 80) score += 1;
  return score;
}

function pickPreferredEmail(
  a: JobCaseEmailRecord,
  b: JobCaseEmailRecord,
): JobCaseEmailRecord {
  const qa = emailRecordQuality(a);
  const qb = emailRecordQuality(b);
  if (qa !== qb) return qa > qb ? a : b;
  return a.at >= b.at ? a : b;
}

export function dedupeJobCaseEmails(records: JobCaseEmailRecord[]): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }

  const byContent = new Map<string, JobCaseEmailRecord>();
  for (const record of byId.values()) {
    const recipient = extractRecipientEmail(record);
    const key = `${record.kind ?? ''}|${record.subject}|${record.at}|${recipient}`;
    const existing = byContent.get(key);
    byContent.set(key, existing ? pickPreferredEmail(existing, record) : record);
  }

  const bySemantic = new Map<string, JobCaseEmailRecord>();
  for (const record of byContent.values()) {
    const semanticKey = semanticDedupeKey(record);
    if (!semanticKey) {
      bySemantic.set(`unique:${record.id}`, record);
      continue;
    }
    const existing = bySemantic.get(semanticKey);
    bySemantic.set(semanticKey, existing ? pickPreferredEmail(existing, record) : record);
  }

  return [...bySemantic.values()].sort((a, b) => b.at.localeCompare(a.at));
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
