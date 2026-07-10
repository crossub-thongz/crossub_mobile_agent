'use client';

import { Download, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  documentPreviewKind,
  isViewableDocumentUrl,
} from '@/lib/document-preview';
import { formatDateTime } from '@/lib/utils';

export type DocumentPreviewItem = {
  title: string;
  fileName?: string;
  uploadedAt?: string;
  href: string;
};

/** Hide Chrome/Edge PDF sidebar thumbnails; keep scrollable page content. */
function pdfPreviewSrc(url: string): string {
  const base = url.split('#')[0] ?? url;
  return `${base}#navpanes=0&scrollbar=1&view=FitH`;
}

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
  const url = doc && isViewableDocumentUrl(doc.href) ? doc.href : undefined;
  const previewKind = url ? documentPreviewKind(url, doc?.fileName) : 'none';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="flex h-[92vh] max-h-[92vh] w-[min(96vw,56rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-4xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle className="truncate text-base">{doc?.title ?? 'Document preview'}</DialogTitle>
          <DialogDescription className="truncate text-xs">
            {propertyAddress}
            {doc?.uploadedAt ? ` · Uploaded ${formatDateTime(doc.uploadedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-secondary/40 min-h-0 flex-1 overflow-hidden rounded-lg border">
          {!url ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <FileText className="text-muted-foreground mb-2 size-10" />
              <p className="text-muted-foreground text-sm">No preview available</p>
            </div>
          ) : previewKind === 'image' ? (
            <div className="flex h-full items-start justify-center overflow-auto bg-black/5 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={doc?.title ?? 'Document'}
                className="h-auto w-full max-w-full object-contain"
              />
            </div>
          ) : previewKind === 'pdf' ? (
            <iframe
              title={doc?.title ?? 'Document'}
              src={pdfPreviewSrc(url)}
              className="h-full min-h-0 w-full border-0 bg-background"
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <FileText className="text-muted-foreground mb-2 size-10" />
              <p className="text-muted-foreground text-sm">
                Preview not supported for this file type
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Use Download below.</p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          {url ? (
            <Button asChild className="gap-1.5">
              <a href={url} download={doc?.title ?? 'document'} target="_blank" rel="noopener noreferrer">
                <Download className="size-3.5" />
                Download
              </a>
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
