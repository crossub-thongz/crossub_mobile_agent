'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  InvoiceDocument,
  type InvoiceDocumentModel,
} from '@/components/accounting/invoice-document';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchInvoice } from '@/lib/crossub-api/agent-client';

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<InvoiceDocumentModel | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) return;
    let cancelled = false;
    setLoading(true);
    setModel(null);
    void fetchInvoice(invoiceId)
      .then((detail) => {
        if (cancelled) return;
        setModel({
          invoiceNumber: detail.invoiceNumber,
          invoiceDate: detail.invoiceDate,
          dueDate: detail.dueDate,
          periodStart: detail.periodStart,
          periodEnd: detail.periodEnd,
          agencyName: detail.agencyName ?? '',
          licenceNumber: detail.licenceNumber,
          reference: detail.reference,
          email: detail.email,
          abn: detail.abn,
          managementFee: detail.managementFee,
          lettingTribunal: detail.lettingTribunal,
          otherService: detail.otherService,
          totalManagementFee: detail.totalManagementFee,
          totalLettingTribunal: detail.totalLettingTribunal,
          totalOtherService: detail.totalOtherService,
          subtotal: detail.subtotal,
          totalGst: detail.totalGst,
          totalAud: detail.totalAud,
          bank: detail.bank,
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load invoice');
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, invoiceId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        elevated
        className="flex max-h-[92vh] w-[min(96vw,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle>Invoice preview</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading || !model ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading invoice…
            </div>
          ) : (
            <InvoiceDocument invoice={model} />
          )}
        </div>
        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
