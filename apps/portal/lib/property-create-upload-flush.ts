import { uploadAgentDocumentFileWithProgress } from '@/lib/crossub-api/agent-client';
import type { UploadAgentDocumentInput } from '@/lib/crossub-api/agent-client';
import {
  resolvePendingUploadGroup,
  resolvePendingUploadTitle,
  uploadCategoryForGroup,
} from '@/lib/property-create-document-groups';
import {
  fileToPendingUploadRecord,
  queuePropertyPendingUploads,
  type PendingPropertyUploadRecord,
} from '@/lib/property-create-pending-uploads';

export type PropertyCreatePendingDocument = {
  id: string;
  file: File;
  title: string;
  slotId: string;
  source: 'leasing' | 'management';
};

/** Upload staged create-property documents to the API (creates PortalDocument rows). */
export async function uploadPropertyCreatePendingDocuments(
  propertyId: string,
  pending: PropertyCreatePendingDocument[],
): Promise<{ succeeded: number; failed: number; failedDocs: PropertyCreatePendingDocument[] }> {
  let succeeded = 0;
  let failed = 0;
  const failedDocs: PropertyCreatePendingDocument[] = [];

  for (const doc of pending) {
    try {
      const group = resolvePendingUploadGroup({ slotId: doc.slotId, title: doc.title });
      const category = uploadCategoryForGroup(group);
      const title = resolvePendingUploadTitle({
        slotId: doc.slotId,
        title: doc.title,
        fileName: doc.file.name,
      });
      await uploadAgentDocumentFileWithProgress(doc.file, {
        category: category as UploadAgentDocumentInput['category'],
        propertyId,
        title,
      });
      succeeded += 1;
    } catch {
      failed += 1;
      failedDocs.push(doc);
    }
  }

  return { succeeded, failed, failedDocs };
}

/** Flush IndexedDB queue (legacy create flow) — same upload path as inline submit. */
export async function uploadQueuedPropertyPendingRecords(
  propertyId: string,
  records: PendingPropertyUploadRecord[],
): Promise<{ succeeded: number; failed: number }> {
  const pending: PropertyCreatePendingDocument[] = records.map((record) => ({
    id: record.id,
    file: new File([record.blob], record.fileName, { type: record.mimeType }),
    title: record.title,
    slotId: record.slotId,
    source: record.source,
  }));
  const result = await uploadPropertyCreatePendingDocuments(propertyId, pending);
  return { succeeded: result.succeeded, failed: result.failed };
}

/** Queue failed uploads for the Documents tab to retry. */
export async function queueFailedPropertyCreateUploads(
  propertyId: string,
  failed: PropertyCreatePendingDocument[],
): Promise<void> {
  if (failed.length === 0) return;
  await queuePropertyPendingUploads(
    propertyId,
    failed.map((doc) =>
      fileToPendingUploadRecord(doc.file, {
        id: doc.id,
        title: doc.title,
        slotId: doc.slotId,
        source: doc.source,
      }),
    ),
  );
}
