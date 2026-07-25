'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Download, ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { JobCaseEmailAttachment } from '@/lib/job-case-email';
import { mimeTypeForAttachmentFilename } from '@/lib/job-case-email';
import { ApiError, fetchApiBlobFromUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

function withDownloadQuery(url: string): string {
  return url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
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

function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Could not load attachment';
}

function isApiRelativeUrl(url: string): boolean {
  const bare = url.split('?')[0] ?? url;
  return bare.startsWith('/api/');
}

/** Public media / data URLs can render in img/iframe without an authenticated BFF fetch. */
function canUseDirectAttachmentUrl(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (/^https?:\/\//i.test(url)) return true;
  if (url.startsWith('/') && !isApiRelativeUrl(url)) return true;
  return false;
}

export function EmailAttachmentList({
  attachments,
  title = 'Attachments',
  className,
  variant = 'panel',
}: {
  attachments: JobCaseEmailAttachment[];
  title?: string;
  className?: string;
  /** panel = detail dialog; inline = compact row beside email list items */
  variant?: 'panel' | 'inline';
}) {
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewMime, setPreviewMime] = useState('application/pdf');

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const closePreview = (open: boolean) => {
    if (!open) {
      setPreviewOpen(false);
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPreviewName('');
    }
  };

  const loadAttachmentBlob = async (
    attachment: JobCaseEmailAttachment,
    download = false,
  ): Promise<Blob | null> => {
    if (!attachment.url) return null;
    setLoadingName(attachment.name);
    try {
      const url = download ? withDownloadQuery(attachment.url) : attachment.url;
      if (canUseDirectAttachmentUrl(url)) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new ApiError(res.status, 'Could not load attachment');
        }
        return res.blob();
      }
      return await fetchApiBlobFromUrl(url);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return null;
    } finally {
      setLoadingName(null);
    }
  };

  const openPreview = async (attachment: JobCaseEmailAttachment) => {
    if (!attachment.url) return;

    if (canUseDirectAttachmentUrl(attachment.url)) {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewBlob(null);
      setPreviewName(attachment.name);
      setPreviewMime(
        attachment.mimeType ?? mimeTypeForAttachmentFilename(attachment.name),
      );
      setPreviewUrl(attachment.url);
      setPreviewOpen(true);
      return;
    }

    const blob = await loadAttachmentBlob(attachment);
    if (!blob) return;

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const mimeType = attachment.mimeType ?? blob.type ?? 'application/pdf';
    setPreviewBlob(blob);
    setPreviewName(attachment.name);
    setPreviewMime(mimeType);
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewOpen(true);
  };

  const downloadAttachment = async (attachment: JobCaseEmailAttachment) => {
    if (!attachment.url) return;
    if (canUseDirectAttachmentUrl(attachment.url)) {
      const anchor = document.createElement('a');
      anchor.href = withDownloadQuery(attachment.url);
      anchor.download = attachment.name;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    const blob = await loadAttachmentBlob(attachment, true);
    if (!blob) return;
    downloadBlob(blob, attachment.name);
  };

  if (attachments.length === 0) return null;

  const stopRowClick = variant === 'inline' ? (event: MouseEvent) => event.stopPropagation() : undefined;

  const attachmentRows = (
    <ul className={variant === 'panel' ? 'space-y-2' : 'mt-2 space-y-1.5'}>
      {attachments.map((attachment) => {
        const loading = loadingName === attachment.name;
        return (
          <li
            key={attachment.name}
            onClick={stopRowClick}
            className={cn(
              'flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2',
              variant === 'inline' ? 'text-[11px]' : 'text-xs',
            )}
          >
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
            {attachment.sizeLabel ? (
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {attachment.sizeLabel}
              </span>
            ) : null}
            {attachment.url ? (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={loading}
                  onClick={(event) => {
                    event.stopPropagation();
                    void openPreview(attachment);
                  }}
                >
                  {loading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <ExternalLink className="size-3" />
                  )}
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={loading}
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadAttachment(attachment);
                  }}
                >
                  <Download className="size-3" />
                  Download
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {variant === 'inline' ? (
        attachmentRows
      ) : (
        <div className={cn('rounded-xl border bg-muted/20 p-3 text-xs', className)}>
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <Paperclip className="size-3.5" />
            {title}
          </p>
          {attachmentRows}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={closePreview}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[110]"
          className={cn(
            'z-[110]',
            'fixed inset-x-0 bottom-0 left-0 top-auto flex h-[min(92dvh,860px)] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-2xl',
            'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-[min(88vh,860px)] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border',
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-muted/20 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold">Attachment preview</DialogTitle>
              <DialogDescription className="truncate text-xs">{previewName}</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!previewBlob && !previewUrl}
                onClick={() => {
                  if (previewBlob) {
                    downloadBlob(previewBlob, previewName);
                    return;
                  }
                  if (!previewUrl) return;
                  const anchor = document.createElement('a');
                  anchor.href = withDownloadQuery(previewUrl);
                  anchor.download = previewName;
                  anchor.target = '_blank';
                  anchor.rel = 'noopener';
                  document.body.appendChild(anchor);
                  anchor.click();
                  anchor.remove();
                }}
              >
                <Download className="size-3.5" />
                Download
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => closePreview(false)}
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1 bg-muted/30">
            {previewUrl ? (
              previewMime.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="mx-auto max-h-full max-w-full object-contain p-4"
                />
              ) : (
                <iframe
                  title={previewName}
                  src={previewUrl}
                  className="size-full border-0 bg-background"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Attachment preview is not available.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
