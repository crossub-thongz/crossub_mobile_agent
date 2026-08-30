'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  buildRentReviewDocumentGroups,
  type RentReviewDocumentRow,
} from '@/lib/rent-review-task-detail';
import { rentReviewApi } from '@/lib/rent-review-api';
import { loadRentReviewLeaseAgreementPdf } from '@/lib/rent-review/rent-review-lease-agreement-pdf';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function openBlob(blob: Blob, filename: string, preview: boolean): void {
  const url = URL.createObjectURL(blob);
  if (preview) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function RentReviewTaskDocuments({
  detail,
}: {
  detail: RentReviewWorkflowDetail;
}) {
  const groups = useMemo(() => buildRentReviewDocumentGroups(detail), [detail]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openGenerated = async (doc: RentReviewDocumentRow) => {
    if (doc.kind === 'href' && doc.href) {
      window.open(doc.href, '_blank', 'noopener,noreferrer');
      return;
    }

    setOpeningId(doc.id);
    try {
      if (doc.kind === 'research') {
        const html = detail.propertyId
          ? `/api/v1/agent/properties/${detail.propertyId}/workflows/rent-review/${detail.id}/research-report.html`
          : null;
        if (html) {
          window.open(html, '_blank', 'noopener,noreferrer');
          return;
        }
        throw new Error('Research report is not available yet.');
      }

      if (doc.kind === 'notice') {
        const blob = await rentReviewApi.downloadNoticeOfRentIncrease(detail.id, {
          weekly: detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly ?? undefined,
          effectiveDate: detail.effectiveDate ?? undefined,
        });
        openBlob(blob, `notice-of-rent-increase-${detail.id.slice(0, 8)}.pdf`, true);
        return;
      }

      if (doc.kind === 'lease-draft' || doc.kind === 'lease-signed') {
        const { blob, filename } = await loadRentReviewLeaseAgreementPdf(detail.id, {
          weekly: detail.proposedWeeklyRent ?? undefined,
          draft: doc.kind === 'lease-draft',
          propertyId: detail.propertyId ?? undefined,
        });
        openBlob(blob, filename, true);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setOpeningId(null);
    }
  };

  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border v2-frosted-surface p-5">
        <p className="text-muted-foreground text-sm">
          No documents on this case yet. The market report, NSW notice, and lease agreement appear
          here as the workflow produces them.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {groups.map((group) => (
        <div key={group.tab} className="space-y-3">
          <h3 className="text-sm font-semibold">{group.tab}</h3>
          {group.people.map((person) => (
            <div key={person.id} className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">From {person.from}</p>
              {person.documents.map((doc) => (
                <article key={doc.id} className="rounded-2xl border v2-frosted-surface p-4">
                  <p className="text-sm font-semibold">{doc.fileName}</p>
                  {doc.kind === 'href' && doc.href ? (
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                    >
                      View document
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={openingId === doc.id}
                      onClick={() => void openGenerated(doc)}
                      className="text-primary mt-2 inline-block text-xs font-semibold hover:underline disabled:opacity-60"
                    >
                      {openingId === doc.id ? 'Opening…' : 'View document'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
