'use client';

import { useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { InspectionReportPdfPreviewDialog } from '@/components/inspections/inspection-report-pdf-preview-dialog';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  buildInspectionReportFilename,
  downloadInspectionReportFromApi,
} from '@/lib/inspection-report-pdf';
import { cn } from '@/lib/utils';

interface InspectionReportDownloadActionsProps {
  inspectionId: string;
  reportUrl?: string | null;
  propertyLabel: string;
  inspectionType?: 'ingoing' | 'outgoing' | 'routine' | 'open';
  fetchPdf?: (id: string) => Promise<Blob>;
  canDownload?: boolean;
  size?: 'sm' | 'default';
  variant?: 'card' | 'inline';
  className?: string;
}

export function InspectionReportDownloadActions({
  inspectionId,
  reportUrl,
  propertyLabel,
  inspectionType = 'ingoing',
  fetchPdf = inspectionsApi.downloadReportPdf,
  canDownload = true,
  size = 'sm',
  variant = 'card',
  className,
}: InspectionReportDownloadActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!canDownload) return null;

  const filename = buildInspectionReportFilename(propertyLabel, inspectionType);
  const title = `${inspectionType.charAt(0).toUpperCase()}${inspectionType.slice(1)} inspection report`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInspectionReportFromApi(inspectionId, filename, fetchPdf);
    } catch {
      toast.error('Could not download the inspection report PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {variant === 'inline' ? (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
          <Button
            type="button"
            variant="outline"
            size={size}
            className="gap-1.5"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="size-3.5" />
            View report
          </Button>
          <Button
            type="button"
            variant="secondary"
            size={size}
            className="gap-1.5"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PDF
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'border-primary/20 bg-primary/5 flex flex-wrap items-center gap-2 rounded-lg border p-3',
            className,
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Inspection report ready</p>
            <p className="text-muted-foreground text-xs">
              View or download the completed report as PDF
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size={size}
              className="gap-1.5"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-3.5" />
              View report
            </Button>
            <Button
              type="button"
              variant="secondary"
              size={size}
              className="gap-1.5"
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      )}

      <InspectionReportPdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportUrl={reportUrl}
        inspectionId={inspectionId}
        fetchPdf={fetchPdf}
        filename={filename}
        title={title}
      />
    </>
  );
}
