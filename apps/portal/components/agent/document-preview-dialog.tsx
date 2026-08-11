'use client';

import { Download, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchApiBlobFromUrl } from '@/lib/api';
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
  downloadFileName?: string;
};

/** Hide Chrome/Edge PDF sidebar thumbnails; keep scrollable page content. */
function pdfPreviewSrc(url: string): string {
  const base = url.split('#')[0] ?? url;
  return `${base}#navpanes=0&scrollbar=1&view=FitH`;
}

async function fetchDocumentBlob(href: string): Promise<Blob> {
  if (href.startsWith('/api/')) {
    return fetchApiBlobFromUrl(href);
  }
  const response = await fetch(href, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load document (${response.status})`);
  }
  return response.blob();
}

function PreviewLoadingState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
      <Loader2 className="text-muted-foreground mb-2 size-8 animate-spin" />
      <p className="text-muted-foreground text-sm">Loading document…</p>
    </div>
  );
}

function PreviewErrorState() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
      <FileText className="text-muted-foreground mb-2 size-10" />
      <p className="text-muted-foreground text-sm">Unable to load the document preview</p>
      <p className="text-muted-foreground mt-1 text-xs">Use Download below.</p>
    </div>
  );
}

/** Fetch PDF as a blob so the browser previews inline instead of downloading. */
function PdfPreviewPanel({ href, title }: { href: string; title: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    void (async () => {
      try {
        const blob = await fetchDocumentBlob(href);
        if (cancelled) return;
        const pdfBlob =
          blob.type === 'application/pdf'
            ? blob
            : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [href]);

  if (loading) return <PreviewLoadingState />;
  if (error || !blobUrl) return <PreviewErrorState />;

  return (
    <iframe
      title={title}
      src={pdfPreviewSrc(blobUrl)}
      className="h-full min-h-0 w-full border-0 bg-background"
    />
  );
}

function DocxPreviewPanel({ href, title }: { href: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    // Keep the host node mounted (see render below) so the ref is available here.
    void (async () => {
      const container = containerRef.current;
      if (!container) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }
      container.innerHTML = '';

      try {
        const blob = await fetchDocumentBlob(href);
        if (cancelled) return;

        const { renderAsync } = await import('docx-preview');
        await renderAsync(blob, container, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [href]);

  return (
    <div className="relative h-full min-h-[320px]">
      {loading ? (
        <div className="absolute inset-0 z-10 bg-background">
          <PreviewLoadingState />
        </div>
      ) : null}
      {error && !loading ? (
        <div className="absolute inset-0 z-10 bg-background">
          <PreviewErrorState />
        </div>
      ) : null}
      <div className="h-full overflow-auto bg-background p-4">
        <div
          ref={containerRef}
          className="docx-preview-host mx-auto max-w-4xl bg-white text-foreground shadow-sm"
          aria-label={title}
        />
      </div>
    </div>
  );
}

export function DocumentPreviewDialog({
  doc,
  subtitle,
  open,
  onClose,
}: {
  doc: DocumentPreviewItem | null;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
}) {
  const url = doc && isViewableDocumentUrl(doc.href) ? doc.href : undefined;
  const previewKind = url ? documentPreviewKind(url, doc?.fileName) : 'none';
  const downloadName = doc?.downloadFileName ?? doc?.fileName ?? doc?.title ?? 'document';
  const [downloadBusy, setDownloadBusy] = useState(false);

  const handleDownload = async () => {
    if (!url) return;
    setDownloadBusy(true);
    try {
      const blob = await fetchDocumentBlob(url);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = downloadName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="flex h-[96vh] max-h-[96vh] w-[min(98vw,72rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-[72rem]"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle className="truncate text-lg">{doc?.title ?? 'Document preview'}</DialogTitle>
          {subtitle || doc?.uploadedAt ? (
            <DialogDescription className="truncate text-sm">
              {subtitle}
              {subtitle && doc?.uploadedAt ? ' · ' : null}
              {doc?.uploadedAt ? `Uploaded ${formatDateTime(doc.uploadedAt)}` : null}
            </DialogDescription>
          ) : null}
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
            open ? <PdfPreviewPanel href={url} title={doc?.title ?? 'Document'} /> : null
          ) : previewKind === 'docx' ? (
            open ? <DocxPreviewPanel href={url} title={doc?.title ?? 'Document'} /> : null
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
            <Button
              type="button"
              className="gap-1.5"
              disabled={downloadBusy}
              onClick={() => void handleDownload()}
            >
              {downloadBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download
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
