'use client';

import { Download, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  downloadAgentMonthlyInvoicePdf,
  type AgentBillingMonthlyInvoice,
} from '@/lib/crossub-api/agent-billing-client';
import {
  inspectionReportPdfEmbedSrc,
  revokeInspectionReportBlobUrl,
} from '@/lib/inspection-report-pdf';
import { cn, formatDate } from '@/lib/utils';

export type PlatformMonthlyInvoiceDialogState = {
  invoice: AgentBillingMonthlyInvoice;
} | null;

type PlatformMonthlyInvoiceDialogProps = {
  state: PlatformMonthlyInvoiceDialogState;
  onOpenChange: (open: boolean) => void;
};

function statusTone(status: string): string {
  if (status === 'paid') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'overdue') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
}

export function PlatformMonthlyInvoiceDialog({
  state,
  onOpenChange,
}: PlatformMonthlyInvoiceDialogProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const invoice = state?.invoice;
  const invoiceId = invoice?.id;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!invoiceId) {
      setPdfBlob(null);
      setPreviewUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setPdfBlob(null);
    setPreviewUrl(null);
    setLoading(true);

    void downloadAgentMonthlyInvoicePdf(invoiceId)
      .then((blob) => {
        if (cancelled) return;
        const normalized = new Blob([blob], { type: 'application/pdf' });
        setPdfBlob(normalized);
        setPreviewUrl(URL.createObjectURL(normalized));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load invoice PDF');
          onOpenChangeRef.current(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  useEffect(() => {
    return () => {
      revokeInspectionReportBlobUrl(previewUrl);
    };
  }, [previewUrl]);

  const fileName = invoice
    ? `${invoice.invoiceNumber.replace(/[^\w.-]+/g, '-') || 'crossub-invoice'}.pdf`
    : 'crossub-invoice.pdf';

  const embedSrc = previewUrl ? inspectionReportPdfEmbedSrc(previewUrl) : null;

  const downloadPdf = async () => {
    if (!invoice) return;
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return;
    }

    setDownloading(true);
    try {
      const blob = await downloadAgentMonthlyInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download invoice');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={state != null} onOpenChange={onOpenChange}>
      <DialogContent
        elevated
        showCloseButton={false}
        className={cn(
          'fixed inset-x-0 bottom-0 left-0 top-auto flex h-[min(92dvh,900px)] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-2xl',
          'sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-[min(88vh,900px)] sm:w-[min(calc(100%-2rem),56rem)] sm:max-w-[min(calc(100%-2rem),56rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border',
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/80 bg-muted/20 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="truncate text-base font-semibold">
                CROSSUB tax invoice
              </DialogTitle>
              {invoice ? (
                <span
                  className={cn(
                    'inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    statusTone(invoice.status),
                  )}
                >
                  {invoice.status}
                </span>
              ) : null}
            </div>
            <DialogDescription className="text-left text-xs leading-relaxed">
              {invoice?.invoiceNumber ?? 'Invoice'}
              {invoice?.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ' · due the 7th'}
              {' · unpaid accounts are held from the 14th'}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-1.5 sm:inline-flex"
              disabled={downloading || loading || !invoice || !pdfBlob}
              onClick={() => void downloadPdf()}
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
              aria-label="Close invoice"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
          {loading ? (
            <div className="text-muted-foreground flex h-full min-h-[240px] items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading invoice PDF…
            </div>
          ) : embedSrc ? (
            <iframe
              title={invoice?.invoiceNumber ? `Tax invoice ${invoice.invoiceNumber}` : 'Tax invoice'}
              src={embedSrc}
              className="absolute inset-0 size-full border-0 bg-background"
            />
          ) : (
            <div className="text-muted-foreground flex h-full min-h-[240px] items-center justify-center px-6 text-center text-sm">
              Tax invoice PDF is not available yet.
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border/80 bg-muted/20 px-4 py-3 sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            disabled={downloading || loading || !invoice || !pdfBlob}
            onClick={() => void downloadPdf()}
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PDF
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
