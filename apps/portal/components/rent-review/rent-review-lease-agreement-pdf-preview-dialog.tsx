'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { downloadRentReviewLeaseAgreementBlob } from '@/lib/rent-review/rent-review-lease-agreement-pdf';

export function RentReviewLeaseAgreementPdfPreviewDialog({
  open,
  onOpenChange,
  title,
  previewUrl,
  filename,
  blob,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  previewUrl: string | null;
  filename: string;
  blob: Blob | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close agreement preview"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border shadow-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-muted-foreground truncate text-xs">{filename}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={!blob}
              onClick={() => blob && downloadRentReviewLeaseAgreementBlob(blob, filename)}
            >
              <Download className="size-3.5" />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/20 p-3">
          {previewUrl ? (
            <iframe
              key={previewUrl}
              title={title}
              src={previewUrl}
              className="h-[min(75vh,640px)] w-full rounded-lg border bg-white"
            />
          ) : (
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Agreement preview is not available.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
