import {
  CONVERSATION_ATTACHMENT_LIMITS,
  CONVERSATION_DELIVERY_SENT,
  FALLBACK_MIME_TYPE,
} from '@/constants/conversations';
import { uploadAgentDocumentFileWithProgress } from '@/lib/crossub-api/agent-client';
import { createAgentConversation } from '@/lib/crossub-api/agent-conversation-client';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/file-upload';
import { shareableStorageUrl } from '@/lib/storage-download-url';
import { escapeHtml } from '@/utils/composer-html';

export type StorageLinkKind = 'inspection' | 'document';

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function fileMime(file: File): string {
  const reported = file.type.trim().toLowerCase();
  if (reported && reported !== FALLBACK_MIME_TYPE) return reported;
  const name = file.name.trim().toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  return reported || FALLBACK_MIME_TYPE;
}

/** PDF by type or name. Some browsers leave `file.type` empty. */
export function isPdfFile(file: File): boolean {
  if (fileMime(file) === 'application/pdf') return true;
  return file.name.trim().toLowerCase().endsWith('.pdf');
}

export type EmailFileSplit = {
  attach: File[];
  link: File[];
  errors: string[];
};

/**
 * Files the email can still try as attachments, and PDFs over the 4 MB mail cap
 * that go out as a download link instead. Other oversized files stay on the
 * attachment path so its own size check reports them.
 */
export function splitEmailFiles(files: readonly File[]): EmailFileSplit {
  const attach: File[] = [];
  const link: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (isPdfFile(file) && file.size > CONVERSATION_ATTACHMENT_LIMITS.maxBytes) {
      if (file.size > MAX_UPLOAD_BYTES) {
        errors.push(`${file.name} exceeds the ${MAX_UPLOAD_LABEL} limit`);
      } else {
        link.push(file);
      }
      continue;
    }
    attach.push(file);
  }
  return { attach, link, errors };
}

/** Visible URL plus an anchor, so the plain-text part of the email still has the link. */
export function downloadLinkHtml(url: string, fileName: string): string {
  const name = escapeHtml(fileName.trim() || 'report.pdf');
  const visible = escapeHtml(url);
  return `<p>${name} is too large to attach. <a href="${escapeAttr(url)}">Download it here</a>.<br>${visible}</p>`;
}

export function downloadLinkPlain(url: string, fileName: string): string {
  const name = fileName.trim() || 'report.pdf';
  return [
    `${name} is too large to attach.`,
    '',
    `Download it here: ${url}`,
    '',
    'This link expires, so open it soon.',
  ].join('\n');
}

async function fetchStorageDownloadUrl(kind: StorageLinkKind, id: string): Promise<string> {
  const params = new URLSearchParams({ kind, id });
  const res = await fetch(`/api/uploads/storage-link?${params}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  let body: { url?: unknown; message?: unknown } | null = null;
  try {
    body = (await res.json()) as { url?: unknown; message?: unknown };
  } catch {
    body = null;
  }
  const url = shareableStorageUrl(body?.url);
  if (!res.ok || !url) {
    const message = typeof body?.message === 'string' && body.message.trim() ? body.message.trim() : '';
    throw new Error(message || 'Could not make a download link');
  }
  return url;
}

function documentIdOf(doc: unknown): string | null {
  if (!doc || typeof doc !== 'object') return null;
  const id = (doc as { id?: unknown }).id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * Store a PDF that email cannot attach, then return the body snippet that
 * carries its short-lived storage link.
 */
export async function pdfDownloadLink(
  file: File,
  propertyId?: string,
): Promise<{ html: string; text: string }> {
  const created = await uploadAgentDocumentFileWithProgress(file, {
    category: 'lease',
    propertyId: propertyId?.trim() || undefined,
    title: file.name,
  });
  const direct = shareableStorageUrl((created as { url?: unknown }).url);
  const id = documentIdOf(created);
  const url = direct ?? (id ? await fetchStorageDownloadUrl('document', id) : null);
  if (!url) {
    throw new Error('The file was saved on the property, but there is no download link to put in the email.');
  }
  const fileName = file.name.trim() || 'report.pdf';
  return { html: downloadLinkHtml(url, fileName), text: downloadLinkPlain(url, fileName) };
}

export function inspectionReportTitle(type: unknown): string {
  if (type === 'INGOING') return 'Ingoing inspection report';
  if (type === 'OUTGOING') return 'Outgoing inspection report';
  if (type === 'ROUTINE') return 'Routine inspection report';
  return 'Inspection report';
}

export function propertyIdFromInspection(
  detail: { propertyId?: unknown },
  listedPropertyId?: string | null,
): string | null {
  if (typeof detail.propertyId === 'string' && detail.propertyId.trim()) return detail.propertyId.trim();
  const listed = listedPropertyId?.trim() ?? '';
  return listed || null;
}

/**
 * Email the inspection report as a download link when the server could not
 * attach the PDF. The recipient is the tenant or owner already on the property.
 */
export async function emailInspectionReportLink(input: {
  inspectionId: string;
  propertyId: string;
  recipient: 'tenant' | 'landlord';
  reportTitle: string;
}): Promise<void> {
  const url = await fetchStorageDownloadUrl('inspection', input.inspectionId);
  const result = await createAgentConversation({
    propertyId: input.propertyId,
    recipient: input.recipient,
    channel: 'email',
    subject: input.reportTitle,
    body: downloadLinkPlain(url, input.reportTitle),
  });
  const delivery = (result as { delivery?: unknown }).delivery;
  if (typeof delivery === 'string' && delivery !== CONVERSATION_DELIVERY_SENT) {
    throw new Error(`Saved, but the email was not sent (${delivery.replace(/_/g, ' ')}).`);
  }
}
