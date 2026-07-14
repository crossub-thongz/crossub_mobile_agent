'use client';

import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { formatCurrency, formatDate } from '@/lib/utils';

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
      <p className="mt-1.5 text-sm">{value}</p>
    </div>
  );
}

export function LeasingContractDialog({
  detail,
  readOnly = false,
  cycleId,
  apiConnected = false,
}: {
  detail: LeasingPropertyDetail;
  readOnly?: boolean;
  cycleId?: string;
  apiConnected?: boolean;
}) {
  const open = useLeasingWorkflowStore((s) => s.contractDialogOpen);
  const setOpen = useLeasingWorkflowStore((s) => s.setContractDialogOpen);
  const [downloading, setDownloading] = useState(false);

  const contract = detail.onboarding.agreement.contract;
  const signingStatus = detail.onboarding.agreement.signingStatus;
  const uploadedFileName = detail.onboarding.agreement.uploadedFileName;
  const isSigned = signingStatus === 'signed';

  const downloadPdf = async () => {
    if (!cycleId) {
      toast.error('Agreement PDF is not available offline');
      return;
    }
    setDownloading(true);
    try {
      const blob = await leasingOpsApi.downloadAgreementPdf(cycleId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${contract.contractId || 'agreement'}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Agreement downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download agreement');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        elevated
        className="border-border bg-card max-h-[90vh] w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-border/60 border-b px-6 py-5">
          <DialogTitle className="text-base font-semibold">
            Agreement · {contract.contractId}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {readOnly
              ? isSigned
                ? 'This agreement is signed and locked.'
                : 'Agreement sent from CROSSUB — review only. Record signing from the onboarding step when complete.'
              : isSigned
                ? 'This agreement is signed and locked.'
                : 'Review lease terms and special conditions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-13rem)] space-y-5 overflow-y-auto px-6 py-5">
          {uploadedFileName && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              Uploaded file: <span className="font-medium">{uploadedFileName}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Template" value={contract.template} />
            <Field label="Lease term" value={contract.leaseTerm} />
            <Field
              label="Weekly rent"
              value={
                contract.weeklyRent ? `${formatCurrency(contract.weeklyRent)}/wk` : '—'
              }
            />
            <Field
              label="Bond"
              value={contract.bond ? formatCurrency(contract.bond) : '—'}
            />
            <Field
              label="Start"
              value={
                contract.startDate
                  ? formatDate(contract.startDate)
                  : detail.rental.moveInDate
                    ? formatDate(detail.rental.moveInDate)
                    : '—'
              }
            />
            <Field
              label="End"
              value={contract.endDate ? formatDate(contract.endDate) : '—'}
            />
            <Field label="Signing status" value={signingStatus.replace('_', ' ')} />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs font-medium">Special conditions</Label>
            <ul className="mt-2 space-y-1.5">
              {contract.specialConditions.length === 0 ? (
                <li className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-[12px]">
                  No special conditions.
                </li>
              ) : (
                contract.specialConditions.map((c) => (
                  <li
                    key={c.id}
                    className="border-border bg-secondary/20 rounded-md border px-3 py-2 text-[12.5px]"
                  >
                    {c.text}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="border-border/60 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          {apiConnected && cycleId && (
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={downloading}
              onClick={() => void downloadPdf()}
            >
              <FileDown className="size-4" />
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
