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

/** The per-file ceiling the API applies to this type. */
export function maxAttachmentBytes(mimeType: string): number {
  return mimeType.startsWith(VIDEO_MIME_PREFIX)
    ? CONVERSATION_ATTACHMENT_LIMITS.maxVideoBytes
    : CONVERSATION_ATTACHMENT_LIMITS.maxBytes;
}

/** A picked file as the reply request carries it (base64). Throws when it is over the cap. */
export async function fileToEmailAttachment(file: File): Promise<AgentConversationAttachmentUpload> {
  const mimeType = file.type || FALLBACK_MIME_TYPE;
  const max = maxAttachmentBytes(mimeType);
  if (file.size > max) throw new Error(CONVERSATIONS_COPY.fileTooBig(file.name, max / MEGABYTE));
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Chunked: one `+=` per byte stalls the tab on a 20 MB video.
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_BYTES));
  }
  return { fileName: file.name, mimeType, sizeBytes: file.size, contentBase64: btoa(binary) };
}
