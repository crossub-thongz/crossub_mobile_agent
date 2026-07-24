import { uploadAgentDocumentFileWithProgress } from '@/lib/crossub-api/agent-client';
import type { AgentDocument } from '@/lib/types';

import {
  peekAgentDocumentUploads,
  removeAgentDocumentUpload,
  type PendingAgentDocumentUpload,
} from './agent-pending-document-uploads';

export async function flushAgentDocumentUploads(): Promise<number> {
  const queued = await peekAgentDocumentUploads();
  if (!queued.length) return 0;

  let flushed = 0;
  for (const record of queued) {
    try {
      const file = new File([record.blob], record.fileName, { type: record.mimeType });
      await uploadAgentDocumentFileWithProgress(file, {
        category: record.category as AgentDocument['category'],
        propertyId: record.propertyId,
        title: record.title,
      });
      await removeAgentDocumentUpload(record.id);
      flushed += 1;
    } catch {
      // Leave failed rows queued for the next reconnect attempt.
    }
  }
  return flushed;
}

export function pendingAgentDocumentUploadToLocalDoc(
  record: PendingAgentDocumentUpload,
): AgentDocument {
  const objectUrl = URL.createObjectURL(record.blob);
  return {
    id: record.id,
    title: record.title,
    propertyAddress: record.propertyAddress,
    category: record.category as AgentDocument['category'],
    uploadedAt: new Date().toISOString(),
    href: objectUrl,
    downloadUrl: objectUrl,
  };
}
