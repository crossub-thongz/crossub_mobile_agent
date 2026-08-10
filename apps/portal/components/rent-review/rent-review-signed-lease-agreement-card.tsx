'use client';

import { useCallback, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { RentReviewLeaseAgreementAudit } from '@/components/rent-review/rent-review-lease-agreement-audit';
import { RentReviewLeaseAgreementPdfPreviewDialog } from '@/components/rent-review/rent-review-lease-agreement-pdf-preview-dialog';
import { Button } from '@/components/ui/button';
import {
  buildLeaseAgreementProgress,
  isPreferredRenewalFixed,
  isTenantAccepted,
  leaseAgreementAuditState,
  leaseAgreementSignedAt,
  shouldShowSignedLeaseAgreement,
} from '@/lib/rent-review/tenant-decision-display';
import {
  downloadRentReviewLeaseAgreementBlob,
  loadRentReviewLeaseAgreementPdf,
} from '@/lib/rent-review/rent-review-lease-agreement-pdf';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatDateTime } from '@/lib/utils';

export function RentReviewSignedLeaseAgreementCard({
  detail,
}: {
  detail: RentReviewWorkflowDetail;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [loading, setLoading] = useState(false);

  const accepted = isTenantAccepted(detail);
  const fixedRenewal = isPreferredRenewalFixed(detail);
  const showSigned = shouldShowSignedLeaseAgreement(detail);
  const signedAt = leaseAgreementSignedAt(detail);
  const leaseSteps = buildLeaseAgreementProgress(detail);

  const openPreview = useCallback(
    async (draft: boolean) => {
      setLoading(true);
      try {
        const { blob, filename } = await loadRentReviewLeaseAgreementPdf(detail.id, {
          weekly: detail.proposedWeeklyRent ?? undefined,
          draft,
          propertyId: detail.propertyId,
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
        setLoading(false);
      }
    },
    [detail.id, detail.propertyId, detail.proposedWeeklyRent],
  );

  const closePreview = useCallback((open: boolean) => {
    setPreviewOpen(open);
    if (!open) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewBlob(null);
    }
  }, []);

  if (!accepted || !fixedRenewal) return null;

  if (!showSigned) {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
          Signed lease agreement pending
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          The tenant accepted the rent increase, but a tenant signature on the lease extension
          agreement has not been recorded yet.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div>
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
            Signed lease extension agreement
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            The tenant signed the NSW residential tenancy agreement in the tenant portal after
            accepting the rent increase. Landlord and agent signatures were applied when the
            agreement was prepared.
            {signedAt ? ` Signed ${formatDateTime(signedAt)}.` : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-emerald-500/40 sm:flex-1"
            disabled={loading}
            onClick={() => void openPreview(false)}
          >
            <FileText className="size-4" />
            {loading ? 'Loading…' : 'View signed agreement'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 sm:flex-1"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const { blob, filename } = await loadRentReviewLeaseAgreementPdf(detail.id, {
                  weekly: detail.proposedWeeklyRent ?? undefined,
                  propertyId: detail.propertyId,
                });
                downloadRentReviewLeaseAgreementBlob(blob, filename);
              } catch (err) {
                toast.error(apiErrorMessage(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            <Download className="size-4" />
            Download signed PDF
          </Button>
        </div>
        <RentReviewLeaseAgreementAudit
          steps={leaseSteps}
          title="Lease agreement workflow"
          onViewAgreement={() => void openPreview(false)}
          viewingAgreement={loading}
          viewLabel="View signed agreement"
        />
      </section>

      <RentReviewLeaseAgreementPdfPreviewDialog
        open={previewOpen}
        onOpenChange={closePreview}
        title="Signed lease extension agreement"
        previewUrl={previewUrl}
        filename={previewFilename}
        blob={previewBlob}
      />
    </>
  );
}
