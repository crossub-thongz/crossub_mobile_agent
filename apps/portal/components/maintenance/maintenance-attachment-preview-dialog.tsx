'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError, fetchApiBlobFromUrl } from '@/lib/api';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import { cn } from '@/lib/utils';

export function maintenanceAttachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

/** @deprecated Use `maintenanceAttachmentPreviewUrl` — kept for older call sites during rollout. */
export const attachmentPreviewUrl = maintenanceAttachmentPreviewUrl;

async function fetchMaintenanceAttachmentBlob(
  att: ApiMaintenanceAttachment,
  init?: RequestInit,
): Promise<Blob> {
  const previewSrc = maintenanceAttachmentPreviewUrl(att);

  if (previewSrc.startsWith('/api/')) {
    return fetchApiBlobFromUrl(previewSrc, init);
  }

  if (previewSrc.startsWith('data:')) {
    const res = await fetch(previewSrc, init);
    if (!res.ok) throw new ApiError(res.status, 'Could not download file');
    return res.blob();
  }

  // Persisted attachments: stream through the API proxy (follows R2 redirects server-side).
  if (!/^INTAKE-/i.test(att.id)) {
    return fetchApiBlobFromUrl(`/api/maintenance/attachments/${att.id}/preview`, init);
  }

  // Synthetic intake rows only exist client-side — download the same URL shown in preview.
  const res = await fetch(previewSrc, init);
  if (!res.ok) throw new ApiError(res.status, 'Could not download file');
  return res.blob();
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function MaintenanceAttachmentPreviewDialog({
  attachment,
  attachments: attachmentsProp,
  onClose,
}: {
  attachment: ApiMaintenanceAttachment | null;
  /** Full gallery for prev/next navigation. Defaults to the single open attachment. */
  attachments?: ApiMaintenanceAttachment[];
  onClose: () => void;
}) {
  const gallery = useMemo(() => {
    if (attachmentsProp?.length) return attachmentsProp;
    if (attachment) return [attachment];
    return [];
  }, [attachmentsProp, attachment]);

  /** Which gallery item is on screen — keyed by id so parent re-renders do not snap back. */
  const [viewedId, setViewedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!attachment) {
      setViewedId(null);
      downloadAbortRef.current?.abort();
      downloadAbortRef.current = null;
      setDownloadingId(null);
      return;
    }
    setViewedId(attachment.id);
  }, [attachment?.id]);

  const currentIndex = viewedId ? gallery.findIndex((item) => item.id === viewedId) : -1;
  const current =
    currentIndex >= 0 ? gallery[currentIndex] : attachment;
  const hasMultiple = gallery.length > 1;

  const goPrev = () => {
    if (!viewedId || gallery.length < 2) return;
    const index = gallery.findIndex((item) => item.id === viewedId);
    if (index < 0) return;
    const prev = gallery[index <= 0 ? gallery.length - 1 : index - 1];
    setViewedId(prev.id);
  };

  const goNext = () => {
    if (!viewedId || gallery.length < 2) return;
    const index = gallery.findIndex((item) => item.id === viewedId);
    if (index < 0) return;
    const next = gallery[index >= gallery.length - 1 ? 0 : index + 1];
    setViewedId(next.id);
  };

  useEffect(() => {
    if (!attachment || !hasMultiple) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachment, hasMultiple, gallery.length, viewedId]);

  if (!attachment || !current) return null;

  const preview = maintenanceAttachmentPreviewUrl(current);
  const downloading = downloadingId === current.id;
  const counterIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleDownload = async () => {
    const target = current;
    if (!target || downloadingId) return;

    const targetId = target.id;
    const targetFileName = target.fileName;

    downloadAbortRef.current?.abort();
    const controller = new AbortController();
    downloadAbortRef.current = controller;
    setDownloadingId(targetId);

    try {
      const blob = await fetchMaintenanceAttachmentBlob(target, { signal: controller.signal });
      if (controller.signal.aborted) return;
      downloadBlob(blob, targetFileName);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not download file';
      toast.error(message);
    } finally {
      if (downloadAbortRef.current === controller) {
        downloadAbortRef.current = null;
      }
      setDownloadingId((id) => (id === targetId ? null : id));
    }
  };

  const isImage = current.mimeType.startsWith('image/');
  const isVideo = current.mimeType.startsWith('video/');
  const isPdf = current.mimeType === 'application/pdf';

  return (
    <Dialog open={!!attachment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" elevated>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <DialogTitle className="min-w-0 truncate text-base">{current.fileName}</DialogTitle>
            {hasMultiple ? (
              <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
                {counterIndex + 1} / {gallery.length}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className={cn('flex items-center', hasMultiple ? 'gap-3' : '')}>
          {hasMultiple ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-10 shrink-0 rounded-full shadow-sm"
              onClick={goPrev}
              aria-label="Previous attachment"
            >
              <ChevronLeft className="size-4" />
            </Button>
          ) : null}

          <div className="max-h-[60vh] min-w-0 flex-1 overflow-hidden rounded-lg border bg-muted">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={current.fileName}
                className="max-h-[60vh] w-full object-contain"
              />
            ) : isVideo ? (
              <video src={preview} controls className="max-h-[60vh] w-full bg-black" />
            ) : isPdf ? (
              <iframe
                src={preview}
                title={current.fileName}
                className="h-[min(60vh,480px)] w-full bg-background"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <FileText className="text-muted-foreground size-10" />
                <p className="text-muted-foreground text-sm">
                  Preview not available for this file type.
                </p>
              </div>
            )}
          </div>

          {hasMultiple ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-10 shrink-0 rounded-full shadow-sm"
              onClick={goNext}
              aria-label="Next attachment"
            >
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </div>

        <DialogFooter className="gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
