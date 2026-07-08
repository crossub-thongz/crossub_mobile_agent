'use client';

import { useEffect, useState } from 'react';
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportUrl?: string | null;
  inspectionId?: string | null;
  fetchPdf?: (id: string) => Promise<Blob>;
  filename: string;
  title?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setLoading(false);
      return;
    }

    if (reportUrl) {
      let active = true;
      setLoading(true);

      void loadInspectionReportPreviewUrl(reportUrl)
        .then((next) => {
          if (!active) {
            revokeInspectionReportPreviewUrl(next, reportUrl);
            return;
          }
          setPreviewUrl(next);
        })
        .catch(() => {
          if (!active) return;
          toast.error('Could not load the report preview');
          setPreviewUrl(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }

    if (inspectionId && fetchPdf) {
      let active = true;
      setLoading(true);

      void loadInspectionReportPreviewFromApi(inspectionId, fetchPdf)
        .then((next) => {
          if (!active) {
            revokeInspectionReportBlobUrl(next);
            return;
          }
          setPreviewUrl(next);
        })
        .catch(() => {
          if (!active) return;
          toast.error('Could not load the report preview');
          setPreviewUrl(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }

    setPreviewUrl(null);
    setLoading(false);
  }, [open, reportUrl, inspectionId, fetchPdf]);

  useEffect(() => {
    return () => {
      if (!previewUrl) return;
      if (reportUrl) {
        revokeInspectionReportPreviewUrl(previewUrl, reportUrl);
        return;
      }
      revokeInspectionReportBlobUrl(previewUrl);
    };
  }, [previewUrl, reportUrl]);

  const handleDownload = () => {
    if (reportUrl) {
      void downloadInspectionReportPdf(reportUrl, filename);
      return;
    }
    if (inspectionId && fetchPdf) {
      void downloadInspectionReportFromApi(inspectionId, filename, fetchPdf).catch(() => {
        toast.error('Could not download the inspection report PDF');
      });
    }
  };

  const canPreview = Boolean(reportUrl || (inspectionId && fetchPdf));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
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
              disabled={!canPreview}
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
          ) : previewUrl ? (
            <iframe
              title={title}
              src={previewUrl}
              className="size-full border-0 bg-background"
            />
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
