import {
  CONVERSATION_ATTACHMENT_LIMITS,
  CONVERSATIONS_COPY,
  FALLBACK_MIME_TYPE,
  VIDEO_MIME_PREFIX,
} from '@/constants/conversations';
import type { AgentConversationAttachmentUpload } from '@/lib/crossub-api/agent-conversation-client';

const MEGABYTE = 1024 * 1024;
/** Bytes per `String.fromCharCode` call — small enough to stay under the engine's argument limit. */
const BASE64_CHUNK_BYTES = 0x8000;
const DATA_URL_IMAGE = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

/** The per-file ceiling the API applies to this type. */
export function maxAttachmentBytes(mimeType: string): number {
  return mimeType.startsWith(VIDEO_MIME_PREFIX)
    ? CONVERSATION_ATTACHMENT_LIMITS.maxVideoBytes
    : CONVERSATION_ATTACHMENT_LIMITS.maxBytes;
}

/** A screenshot paste often has an empty name; the API still needs a file name. */
function attachmentFileName(name: string, mimeType: string, index: number): string {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  const subtype = (mimeType.split('/')[1] ?? 'bin').split('+')[0].toLowerCase().replace('jpeg', 'jpg');
  const ext = /^[a-z0-9]+$/.test(subtype) ? subtype : 'bin';
  return `attachment-${index + 1}.${ext}`;
}

/** Files from a paste or drop. Some browsers only expose an image through `items`. */
export function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return [];
  const listed = Array.from(data.files);
  if (listed.length > 0) return listed;
  const fromItems: File[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  return fromItems;
}

/** An image copied as HTML (`data:` src) rather than as a file. */
export function imageFilesFromHtml(html: string): File[] {
  if (!html.includes('data:image/') || typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const files: File[] = [];
  for (const img of doc.querySelectorAll('img')) {
    const file = fileFromDataUrl(img.getAttribute('src') ?? '', files.length);
    if (file) files.push(file);
    if (files.length >= CONVERSATION_ATTACHMENT_LIMITS.maxFiles) break;
  }
  return files;
}

function fileFromDataUrl(dataUrl: string, index: number): File | null {
  const match = DATA_URL_IMAGE.exec(dataUrl.trim());
  if (!match) return null;
  try {
    const mimeType = match[1].toLowerCase();
    const binary = atob(match[2].replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], attachmentFileName('', mimeType, index), { type: mimeType });
  } catch {
    return null;
  }
}

/** A picked file as the reply request carries it (base64). Throws when it is over the cap. */
export async function fileToEmailAttachment(file: File, index = 0): Promise<AgentConversationAttachmentUpload> {
  const mimeType = file.type || FALLBACK_MIME_TYPE;
  const fileName = attachmentFileName(file.name, mimeType, index);
  const max = maxAttachmentBytes(mimeType);
  if (file.size > max) throw new Error(CONVERSATIONS_COPY.fileTooBig(fileName, max / MEGABYTE));
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Chunked: one `+=` per byte stalls the tab on a 20 MB video.
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_BYTES));
  }
  return { fileName, mimeType, sizeBytes: file.size, contentBase64: btoa(binary) };
}
