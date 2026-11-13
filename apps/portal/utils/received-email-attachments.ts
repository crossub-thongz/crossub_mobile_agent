import {
  EMAIL_ATTACHMENT_COPY,
  EMAIL_IMAGE_EXTENSIONS,
  EMAIL_IMAGE_MIME_PREFIX,
  EMAIL_PDF_MIME,
  EMAIL_SIGNATURE_IMAGE_STEM,
  EMAIL_SIGNATURE_IMAGE_WORD,
  EMAIL_SIGNATURE_JUNK_FILE,
} from '@/constants/email-attachments';

/**
 * Facts the thread and the job-email list already have on a received file.
 * A signature logo is an inline image; a ledger or reference is a named document.
 */
export type EmailAttachmentFacts = {
  name: string;
  mimeType?: string;
  url?: string;
  inline?: boolean;
  contentId?: string;
  sizeBytes?: number;
  sizeLabel?: string;
};

const IMAGE_EXTENSIONS = new Set<string>(EMAIL_IMAGE_EXTENSIONS);
const DOC_EXTENSIONS = new Set(['doc', 'docx', 'rtf']);
const SHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'csv']);

/** A stored "Attachment 3" label, with no real file name. */
const GENERIC_ATTACHMENT_LABEL = /^(attachment|att|file)[-_\s]?\d+$/i;

type AttachmentSource = {
  name?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  url?: string | null;
  inline?: boolean | null;
  contentId?: string | null;
  sizeBytes?: number | null;
  sizeLabel?: string | null;
};

export function emailAttachmentFacts(source: AttachmentSource): EmailAttachmentFacts {
  return {
    name: (source.fileName ?? source.name ?? '').trim(),
    mimeType: source.mimeType?.trim() || undefined,
    url: source.url?.trim() || undefined,
    inline: source.inline === true,
    contentId: source.contentId?.trim() || undefined,
    sizeBytes: typeof source.sizeBytes === 'number' ? source.sizeBytes : undefined,
    sizeLabel: source.sizeLabel?.trim() || undefined,
  };
}

function extensionOf(fileName: string): string {
  const base = fileName.trim().toLowerCase().split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1);
}

function fileNameFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const path = url.split('?')[0]?.split('#')[0] ?? '';
  let last = '';
  try {
    last = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '');
  } catch {
    return null;
  }
  if (!last.includes('.')) return null;
  const stem = last.slice(0, last.lastIndexOf('.'));
  if (!stem || /^[0-9a-f-]{16,}$/i.test(stem)) return null;
  if (/^(preview|download|attachment|file)$/i.test(stem)) return null;
  return last;
}

/** Prefer the real file name when the record only stored "Attachment 4". */
export function resolveAttachmentName(facts: EmailAttachmentFacts): string {
  const named = facts.name.trim();
  if (named && !GENERIC_ATTACHMENT_LABEL.test(named)) return named;
  return fileNameFromUrl(facts.url) ?? (named || 'Attachment');
}

function isImageAttachment(facts: EmailAttachmentFacts, fileName: string): boolean {
  const mime = facts.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith(EMAIL_IMAGE_MIME_PREFIX)) return true;
  return IMAGE_EXTENSIONS.has(extensionOf(fileName));
}

function isGenericSignatureName(fileName: string): boolean {
  const base = fileName.trim().toLowerCase().split(/[/\\]/).pop() ?? '';
  const stem = base.replace(/\.[a-z0-9]+$/, '');
  if (EMAIL_SIGNATURE_IMAGE_STEM.test(stem)) return true;
  if (base.includes(' ') || stem.length > 40) return false;
  return EMAIL_SIGNATURE_IMAGE_WORD.test(stem);
}

/**
 * An image the mail app embedded in the signature or the HTML body.
 * A PDF, a spreadsheet, or a photo with a real name stays a file.
 */
export function isSignatureImageAttachment(facts: EmailAttachmentFacts): boolean {
  const fileName = resolveAttachmentName(facts);
  if (EMAIL_SIGNATURE_JUNK_FILE.test(fileName)) return true;
  if (!isImageAttachment(facts, fileName)) return false;
  if (facts.inline || facts.contentId) return true;
  return isGenericSignatureName(fileName);
}

export function partitionEmailAttachments<T>(
  items: readonly T[],
  toFacts: (item: T) => EmailAttachmentFacts,
): { files: T[]; signatureImages: T[] } {
  const files: T[] = [];
  const signatureImages: T[] = [];
  for (const item of items) {
    if (isSignatureImageAttachment(toFacts(item))) signatureImages.push(item);
    else files.push(item);
  }
  return { files, signatureImages };
}

/** Short type the reader can scan without opening the file. */
export function attachmentKindLabel(facts: EmailAttachmentFacts): string | null {
  const fileName = resolveAttachmentName(facts);
  const ext = extensionOf(fileName);
  const mime = facts.mimeType?.toLowerCase() ?? '';
  if (ext === 'pdf' || mime === EMAIL_PDF_MIME) return EMAIL_ATTACHMENT_COPY.kindPdf;
  if (DOC_EXTENSIONS.has(ext)) return EMAIL_ATTACHMENT_COPY.kindDoc;
  if (SHEET_EXTENSIONS.has(ext)) return EMAIL_ATTACHMENT_COPY.kindSheet;
  if (isImageAttachment(facts, fileName)) return EMAIL_ATTACHMENT_COPY.kindImage;
  if (ext) return ext.toUpperCase();
  return null;
}

export function attachmentSizeLabel(facts: EmailAttachmentFacts): string | undefined {
  if (facts.sizeLabel) return facts.sizeLabel;
  const bytes = facts.sizeBytes;
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}
