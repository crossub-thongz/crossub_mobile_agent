'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  downloadInspectionReportFromApi,
  downloadInspectionReportPdf,
  inspectionReportAuthenticatedPreviewHrefs,
  inspectionReportPdfEmbedSrc,
  isSafeInspectionReportFallbackUrl,
  loadInspectionReportPreviewFromApi,
  loadInspectionReportPreviewUrl,
  revokeInspectionReportBlobUrl,
  revokeInspectionReportPreviewUrl,
} from '@/lib/inspection-report-pdf';

export function InspectionReportPdfPreviewDialog({
  open,
  onOpenChange,
  reportUrl,
  inspectionId,
  fetchPdf,
  filename,
  title = 'Inspection report',
  inspectionType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportUrl?: string | null;
  inspectionId?: string | null;
  fetchPdf?: (id: string) => Promise<Blob>;
  filename: string;
  title?: string;
  inspectionType?: 'ingoing' | 'outgoing' | 'routine' | 'open';
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchPdfRef = useRef(fetchPdf);

  fetchPdfRef.current = fetchPdf;

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPreviewUrl(null);

    const keep = (next: string) => {
      if (cancelled) {
        if (next.startsWith('blob:')) revokeInspectionReportBlobUrl(next);
        return false;
      }
      setPreviewUrl(next);
      return true;
    };

    void (async () => {
      if (inspectionId && fetchPdfRef.current) {
        try {
          const next = await loadInspectionReportPreviewFromApi(
            inspectionId,
            fetchPdfRef.current,
          );
          if (keep(next)) return;
        } catch {
          // Fall through to the filed-document proxy.
        }
      }

      if (inspectionId) {
        for (const href of inspectionReportAuthenticatedPreviewHrefs(inspectionId)) {
          try {
            const next = await loadInspectionReportPreviewUrl(href);
            if (keep(next)) return;
          } catch {
            // Try the next authenticated source.
          }
        }
      }

      if (
        reportUrl &&
        isSafeInspectionReportFallbackUrl(reportUrl, inspectionId, inspectionType)
      ) {
        try {
          const next = await loadInspectionReportPreviewUrl(reportUrl);
          if (keep(next)) return;
        } catch {
          // Fall through to the empty state.
        }
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, reportUrl, inspectionId, fetchPdf, inspectionType]);

  useEffect(() => {
    return () => {
      if (!previewUrl) return;
      if (previewUrl.startsWith('blob:')) {
        revokeInspectionReportBlobUrl(previewUrl);
        return;
      }
      if (reportUrl) {
        revokeInspectionReportPreviewUrl(previewUrl, reportUrl);
      }
    };
  }, [previewUrl, reportUrl]);

  const handleDownload = () => {
    const fetch = fetchPdfRef.current;
    if (inspectionId && fetch) {
      void downloadInspectionReportFromApi(inspectionId, filename, fetch).catch(() => {
        if (
          reportUrl &&
          isSafeInspectionReportFallbackUrl(reportUrl, inspectionId, inspectionType)
        ) {
          void downloadInspectionReportPdf(reportUrl, filename);
          return;
        }
        toast.error('Could not download the inspection report PDF');
      });
      return;
    }
    if (reportUrl) {
      void downloadInspectionReportPdf(reportUrl, filename);
    }
  };

  const canDownload = Boolean(reportUrl || (inspectionId && fetchPdf));
  const embedSrc = previewUrl ? inspectionReportPdfEmbedSrc(previewUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        elevated
        showCloseButton={false}
        className={cn(
          'fixed inset-x-0 bottom-0 left-0 top-auto flex h-[min(92dvh,860px)] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-2xl',
          'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-[min(88vh,860px)] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border',
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base font-semibold">{title}</DialogTitle>
            <DialogDescription className="truncate text-xs">{filename}</DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canDownload}
              onClick={handleDownload}
            >
              <Download className="size-3.5" />
              Download PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-muted/30">
          {loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading report…
            </div>
          ) : embedSrc ? (
            <object
              title={title}
              data={embedSrc}
              type="application/pdf"
              className="size-full border-0 bg-background"
            >
              <iframe
                title={title}
                src={embedSrc}
                className="size-full border-0 bg-background"
              />
            </object>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-sm">
              Report PDF is not available yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
