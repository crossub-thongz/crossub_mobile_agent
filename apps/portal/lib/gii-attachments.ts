import { fileToBase64 } from '@/lib/file-upload';

export const GII_MAX_ATTACHMENTS = 5;

/** Keep chat payloads reasonable — Gii reads PDFs/images natively. */
export const GII_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const GII_ATTACHMENT_ACCEPT = 'image/*,application/pdf';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const BLOCKED_VIDEO = /^video\//i;

export type GiiPendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
};

export type GiiChatAttachmentView = {
  fileName: string;
  mediaType: string;
  previewUrl?: string;
};

export type GiiApiAttachment = {
  fileName: string;
  mediaType: string;
  base64: string;
};

function attachmentId(): string {
  return `gii-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isGiiAttachmentAllowed(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (BLOCKED_VIDEO.test(mime)) return false;
  if (ALLOWED_MIME.has(mime)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'pdf' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
}

export function normalizeGiiAttachmentMime(file: File): string {
  const mime = (file.type || '').toLowerCase();
  if (ALLOWED_MIME.has(mime)) {
    return mime === 'image/jpg' ? 'image/jpeg' : mime;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return mime || 'application/octet-stream';
}

export function createPendingAttachment(file: File): GiiPendingAttachment | null {
  if (!isGiiAttachmentAllowed(file)) return null;
  if (file.size > GII_MAX_ATTACHMENT_BYTES) return null;
  const previewUrl = file.type.startsWith('image/')
    ? URL.createObjectURL(file)
    : null;
  return { id: attachmentId(), file, previewUrl };
}

export function revokePendingAttachment(att: GiiPendingAttachment): void {
  if (att.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(att.previewUrl);
  }
}

export function revokePendingAttachments(atts: GiiPendingAttachment[]): void {
  for (const att of atts) revokePendingAttachment(att);
}

export function pendingToView(att: GiiPendingAttachment): GiiChatAttachmentView {
  return {
    fileName: att.file.name,
    mediaType: normalizeGiiAttachmentMime(att.file),
    previewUrl: att.previewUrl ?? undefined,
  };
}

export async function pendingToApiAttachments(
  atts: GiiPendingAttachment[],
): Promise<GiiApiAttachment[]> {
  const out: GiiApiAttachment[] = [];
  for (const att of atts) {
    out.push({
      fileName: att.file.name,
      mediaType: normalizeGiiAttachmentMime(att.file),
      base64: await fileToBase64(att.file),
    });
  }
  return out;
}

export function filterGiiAttachmentFiles(
  files: File[],
  existingCount: number,
): { added: File[]; rejected: File[]; overLimit: boolean } {
  const added: File[] = [];
  const rejected: File[] = [];
  let slots = GII_MAX_ATTACHMENTS - existingCount;
  for (const file of files) {
    if (slots <= 0) {
      rejected.push(file);
      continue;
    }
    if (!isGiiAttachmentAllowed(file) || file.size > GII_MAX_ATTACHMENT_BYTES) {
      rejected.push(file);
      continue;
    }
    added.push(file);
    slots -= 1;
  }
  return { added, rejected, overLimit: slots <= 0 && files.length > added.length };
}
