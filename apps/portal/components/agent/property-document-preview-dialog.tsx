'use client';

import {
  DocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/document-preview-dialog';

export type { DocumentPreviewItem };

export function PropertyDocumentPreviewDialog({
  doc,
  propertyAddress,
  open,
  onClose,
}: {
  doc: DocumentPreviewItem | null;
  propertyAddress: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <DocumentPreviewDialog
      doc={doc}
      subtitle={propertyAddress}
      open={open}
      onClose={onClose}
    />
  );
}
