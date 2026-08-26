'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewLeaseAgreementTermsField } from '@/components/rent-review/rent-review-lease-agreement-terms-field';
import { RentReviewLeaseAgreementPdfPreviewDialog } from '@/components/rent-review/rent-review-lease-agreement-pdf-preview-dialog';
import {
  buildLeaseAgreementProgress,
  isLeaseAgreementSigned,
  isPreferredRenewalFixed,
  isTenantAccepted,
  leaseAgreementAuditState,
} from '@/lib/rent-review/tenant-decision-display';
import { loadRentReviewLeaseAgreementPdf } from '@/lib/rent-review/rent-review-lease-agreement-pdf';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewLeaseAgreementContractPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');

  const accepted = isTenantAccepted(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const signed = isLeaseAgreementSigned(detail);
  const leaseAudit = leaseAgreementAuditState(detail);
  const leaseSteps = buildLeaseAgreementProgress(detail);
  const canEditTerms = !leaseAudit.sentDone && !signed;
  const canSend = leaseAudit.preparingDone && !leaseAudit.sentDone && !signed;

  // Every action in this panel is property-scoped (it sends and renders documents under
  // /agent/properties/{propertyId}/...), so a review with no property has nothing to show.
  // Narrowing to a local const rather than relying on `detail.propertyId` keeps the type
  // through the async callbacks below — TS discards property-access narrowing inside a closure.
  if (!accepted || !fixedRenewal || signed || !detail.propertyId) return null;
  const propertyId = detail.propertyId;

  const run = async (action: () => Promise<RentReviewWorkflowDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
      return updated;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const previewAgreement = async () => {
    setPreviewing(true);
    try {
      const { blob, filename } = await loadRentReviewLeaseAgreementPdf(detail.id, {
        draft: true,
        weekly: detail.proposedWeeklyRent ?? undefined,
        propertyId,
      });
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setPreviewBlob(blob);
      setPreviewFilename(filename);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPreviewing(false);
    }
  };

  const closePreview = (open: boolean) => {
    setPreviewOpen(open);
    if (!open) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewBlob(null);
    }
  };

  return (
    <>
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Lease extension agreement</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            The tenant accepted the rent increase. Edit the NSW residential tenancy agreement if
            needed, preview it, then send it for tenant signature — the same flow as a new leasing
            contract.
          </p>
        </div>

        {canEditTerms ? (
          <RentReviewLeaseAgreementTermsField
            detail={detail}
            disabled={busy}
            previewing={previewing}
            onPreview={() => void previewAgreement()}
            onSave={async (input) => {
              const updated = await runMutation(
                detail.id,
                rentReviewApi.updateLeaseAgreementTerms(
                  detail.id,
                  input,
                  detail.propertyId,
                  detail.leaseEndDate,
                ),
              );
              onUpdated?.(updated);
              return updated;
            }}
          />
        ) : leaseAudit.sentDone ? (
          <p className="text-muted-foreground rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-relaxed">
            The agreement was emailed to the tenant. Awaiting their signature in the tenant portal.
          </p>
        ) : null}

        {canSend ? (
          <Button
            type="button"
            className="w-full gap-2"
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  rentReviewApi.sendLeaseAgreement(
                    detail.id,
                    propertyId,
                    detail.leaseEndDate,
                  ),
                'Lease agreement sent to tenant',
              )
            }
          >
            <Send className="size-4" />
            Send agreement to tenant
          </Button>
        ) : null}

        <RentReviewLeaseAgreementAudit steps={leaseSteps} title="Agreement workflow" />
      </section>

      <RentReviewLeaseAgreementPdfPreviewDialog
        open={previewOpen}
        onOpenChange={closePreview}
        title="Lease extension agreement preview"
        previewUrl={previewUrl}
        filename={previewFilename}
        blob={previewBlob}
      />
    </>
  );
}
