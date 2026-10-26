'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NATIVE_SELECT_CLASS } from '@/constants/form-controls';
import {
  LEASE_RENEWAL_ARRANGEMENT,
  TENANCY_REVIEW_COPY as COPY,
  TENANCY_REVIEW_CLOSE_OUTCOME,
  TENANCY_REVIEW_KIND,
  type LeaseRenewalArrangement,
  type TenancyReviewCloseOutcome,
  type TenancyReviewKind,
} from '@/constants/self-managed-tenancy-review';
import {
  chooseTenancyReviewKind,
  closeTenancyReview,
  completeTenancyReviewLeaseRenewal,
  postponeTenancyReview,
  reopenTenancyReviewNegotiation,
  reserveTenancyReviewNotice,
  reviseTenancyReviewLeaseExtension,
  runTenancyReviewMarketResearch,
  uploadTenancyReviewLeaseExtension,
  uploadTenancyReviewNotice,
  uploadTenancyReviewSignedLeaseExtension,
} from '@/lib/crossub-api/agent-tenancy-review-client';
import { readFileUploadPayload } from '@/lib/leasing-applicant-upload.util';
import { hasMarketResearchComplete } from '@/lib/rent-review/agent-workflow-model';
import {
  EMPTY_CLOSE_REVIEW_FORM,
  buildCloseReviewInput,
  buildLeaseRenewalInput,
  hasAnySelfManagedReviewAction,
  leaseRenewalFormFrom,
  runSelfManagedReviewWrite,
  selfManagedReviewActions,
  type CloseReviewForm,
  type LeaseRenewalForm,
} from '@/lib/rent-review/self-managed-review';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';

const PDF_ACCEPT = 'application/pdf';
const PDF_MIME = 'application/pdf';

type Write = (propertyId: string, reviewId: string) => Promise<unknown>;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        {hint ? <p className="text-muted-foreground text-[12px] leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function PdfButton({
  label,
  disabled,
  onFile,
}: {
  label: string;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        'border-input bg-background hover:bg-secondary/40 inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-medium',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {label}
      <input
        type="file"
        accept={PDF_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/**
 * Self-Manage Tenancy Review: the steps CROSSUB runs from the admin portal on other plans — the
 * pathway, the lease renewal, the market research, the notice and agreement documents, reopening
 * an agreed negotiation, postponing and closing — run by the agent. Each step shows only while
 * the review is at a stage it applies to; the server re-checks every one.
 */
export function RentReviewSelfManagedActions({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [pending, setPending] = useState<string | null>(null);
  const [renewal, setRenewal] = useState<LeaseRenewalForm>(() => leaseRenewalFormFrom(detail));
  const [closeForm, setCloseForm] = useState<CloseReviewForm>(EMPTY_CLOSE_REVIEW_FORM);
  const [signedBy, setSignedBy] = useState('');
  const [signedOn, setSignedOn] = useState('');
  const [reviseReason, setReviseReason] = useState('');
  const [reserveReason, setReserveReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const actions = selfManagedReviewActions(detail);
  if (!hasAnySelfManagedReviewAction(actions)) return null;
  const busy = pending !== null;

  const run = async (key: string, write: Write, success: string): Promise<boolean> => {
    setPending(key);
    try {
      const updated = await runMutation(detail.id, runSelfManagedReviewWrite(detail, write));
      onUpdated?.(updated);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    } finally {
      setPending(null);
    }
  };

  const uploadPdf = (
    key: string,
    file: File,
    write: (payload: Awaited<ReturnType<typeof readFileUploadPayload>>) => Write,
    success: string,
  ) => {
    if (file.type !== PDF_MIME) {
      toast.error(COPY.pdfOnly);
      return;
    }
    void (async () => {
      const payload = await readFileUploadPayload(file);
      await run(key, write(payload), success);
    })();
  };

  const choosePathway = (kind: TenancyReviewKind) =>
    void run(`kind-${kind}`, (p, r) => chooseTenancyReviewKind(p, r, { kind }), COPY.pathwayChosen[kind]);

  const completeRenewal = () => {
    const input = buildLeaseRenewalInput(renewal);
    if (!input) {
      toast.error(COPY.required);
      return;
    }
    void run('renewal', (p, r) => completeTenancyReviewLeaseRenewal(p, r, input), COPY.renewalCompleted);
  };

  const closeReview = () => {
    const input = buildCloseReviewInput(closeForm);
    if (!input) {
      toast.error(COPY.required);
      return;
    }
    void run('close', (p, r) => closeTenancyReview(p, r, input), COPY.closed);
  };

  const withReason = (
    key: string,
    reason: string,
    write: (reason: string) => Write,
    success: string,
    reset: () => void,
  ) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error(COPY.required);
      return;
    }
    void run(key, write(trimmed), success).then((ok) => ok && reset());
  };

  const fixedRenewal = renewal.leaseArrangement === LEASE_RENEWAL_ARRANGEMENT.FIXED;
  const increased = closeForm.outcome === TENANCY_REVIEW_CLOSE_OUTCOME.RENT_INCREASED;

  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-primary text-xs font-semibold uppercase">{COPY.title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{COPY.hint}</p>
      </div>

      {actions.choosePathway ? (
        <Section title={COPY.pathwayTitle} hint={COPY.pathwayHint}>
          <div className="flex flex-wrap gap-2">
            {Object.values(TENANCY_REVIEW_KIND).map((kind) => (
              <Button
                key={kind}
                type="button"
                size="sm"
                variant={detail.reviewKind === kind ? 'default' : 'outline'}
                disabled={busy}
                onClick={() => choosePathway(kind)}
              >
                {COPY.pathwayLabel[kind]}
              </Button>
            ))}
          </div>
        </Section>
      ) : null}

      {actions.leaseRenewalForm ? (
        <Section title={COPY.renewalTitle} hint={COPY.renewalHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`renewal-arrangement-${detail.id}`}>{COPY.arrangement}</Label>
              <select
                id={`renewal-arrangement-${detail.id}`}
                className={NATIVE_SELECT_CLASS}
                value={renewal.leaseArrangement}
                disabled={busy}
                onChange={(e) =>
                  setRenewal((f) => ({ ...f, leaseArrangement: e.target.value as LeaseRenewalArrangement }))
                }
              >
                {Object.values(LEASE_RENEWAL_ARRANGEMENT).map((value) => (
                  <option key={value} value={value}>
                    {COPY.arrangementLabel[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`renewal-start-${detail.id}`}>{COPY.newLeaseStart}</Label>
              <Input
                id={`renewal-start-${detail.id}`}
                type="date"
                value={renewal.newLeaseStartDate}
                disabled={busy}
                onChange={(e) => setRenewal((f) => ({ ...f, newLeaseStartDate: e.target.value }))}
              />
            </div>
            {fixedRenewal ? (
              <div className="space-y-1">
                <Label htmlFor={`renewal-end-${detail.id}`}>{COPY.newLeaseEnd}</Label>
                <Input
                  id={`renewal-end-${detail.id}`}
                  type="date"
                  value={renewal.newLeaseEndDate}
                  disabled={busy}
                  onChange={(e) => setRenewal((f) => ({ ...f, newLeaseEndDate: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor={`renewal-rent-${detail.id}`}>{COPY.newWeeklyRent}</Label>
              <Input
                id={`renewal-rent-${detail.id}`}
                type="number"
                min="0"
                step="0.01"
                value={renewal.newWeeklyRent}
                disabled={busy}
                onChange={(e) => setRenewal((f) => ({ ...f, newWeeklyRent: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`renewal-increase-${detail.id}`}>{COPY.rentIncreaseOn}</Label>
              <Input
                id={`renewal-increase-${detail.id}`}
                type="date"
                value={renewal.rentIncreaseEffectiveDate}
                disabled={busy}
                onChange={(e) =>
                  setRenewal((f) => ({ ...f, rentIncreaseEffectiveDate: e.target.value }))
                }
              />
            </div>
          </div>
          <Button type="button" size="sm" disabled={busy} onClick={completeRenewal}>
            {pending === 'renewal' ? COPY.busy : COPY.completeRenewal}
          </Button>
        </Section>
      ) : null}

      {actions.marketResearch ? (
        <Section title={COPY.researchTitle} hint={COPY.researchHint}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run('research', (p, r) => runTenancyReviewMarketResearch(p, r), COPY.researchDone)
            }
          >
            {pending === 'research'
              ? COPY.busy
              : hasMarketResearchComplete(detail)
                ? COPY.rerunResearch
                : COPY.runResearch}
          </Button>
        </Section>
      ) : null}

      {actions.uploadNotice || actions.leaseExtension ? (
        <Section title={COPY.documentsTitle}>
          <div className="flex flex-wrap gap-2">
            {actions.uploadNotice ? (
              <PdfButton
                label={pending === 'notice' ? COPY.busy : COPY.uploadNotice}
                disabled={busy}
                onFile={(file) =>
                  uploadPdf(
                    'notice',
                    file,
                    (payload) => (p, r) => uploadTenancyReviewNotice(p, r, payload),
                    COPY.noticeUploaded,
                  )
                }
              />
            ) : null}
            {actions.leaseExtension ? (
              <PdfButton
                label={pending === 'extension' ? COPY.busy : COPY.uploadLeaseExtension}
                disabled={busy}
                onFile={(file) =>
                  uploadPdf(
                    'extension',
                    file,
                    (payload) => (p, r) => uploadTenancyReviewLeaseExtension(p, r, payload),
                    COPY.leaseExtensionUploaded,
                  )
                }
              />
            ) : null}
          </div>
          {actions.leaseExtension ? (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`signed-by-${detail.id}`}>{COPY.signedBy}</Label>
                  <Input
                    id={`signed-by-${detail.id}`}
                    value={signedBy}
                    disabled={busy}
                    onChange={(e) => setSignedBy(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`signed-on-${detail.id}`}>{COPY.signedOn}</Label>
                  <Input
                    id={`signed-on-${detail.id}`}
                    type="date"
                    value={signedOn}
                    disabled={busy}
                    onChange={(e) => setSignedOn(e.target.value)}
                  />
                </div>
              </div>
              <PdfButton
                label={pending === 'signed' ? COPY.busy : COPY.uploadSigned}
                disabled={busy}
                onFile={(file) =>
                  uploadPdf(
                    'signed',
                    file,
                    (payload) => (p, r) =>
                      uploadTenancyReviewSignedLeaseExtension(p, r, {
                        ...payload,
                        ...(signedBy.trim() ? { signedBy: signedBy.trim() } : {}),
                        ...(signedOn ? { signedOn } : {}),
                      }),
                    COPY.signedUploaded,
                  )
                }
              />
              <div className="space-y-1">
                <Label htmlFor={`revise-${detail.id}`}>{COPY.reviseReason}</Label>
                <Textarea
                  id={`revise-${detail.id}`}
                  rows={2}
                  value={reviseReason}
                  disabled={busy}
                  onChange={(e) => setReviseReason(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    withReason(
                      'revise',
                      reviseReason,
                      (reason) => (p, r) => reviseTenancyReviewLeaseExtension(p, r, { reason }),
                      COPY.revised,
                      () => setReviseReason(''),
                    )
                  }
                >
                  {pending === 'revise' ? COPY.busy : COPY.revise}
                </Button>
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {actions.reserveNotice ? (
        <Section title={COPY.reserveTitle}>
          <Label htmlFor={`reserve-${detail.id}`}>{COPY.reserveReason}</Label>
          <Textarea
            id={`reserve-${detail.id}`}
            rows={2}
            value={reserveReason}
            disabled={busy}
            onChange={(e) => setReserveReason(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              withReason(
                'reserve',
                reserveReason,
                (reason) => (p, r) =>
                  reserveTenancyReviewNotice(p, r, {
                    reason,
                    ...(detail.proposedWeeklyRent != null ? { weekly: detail.proposedWeeklyRent } : {}),
                  }),
                COPY.reserved,
                () => setReserveReason(''),
              )
            }
          >
            {pending === 'reserve' ? COPY.busy : COPY.reserve}
          </Button>
        </Section>
      ) : null}

      {actions.reopenNegotiation ? (
        <Section title={COPY.reopenTitle}>
          <Label htmlFor={`reopen-${detail.id}`}>{COPY.reopenReason}</Label>
          <Textarea
            id={`reopen-${detail.id}`}
            rows={2}
            value={reopenReason}
            disabled={busy}
            onChange={(e) => setReopenReason(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              withReason(
                'reopen',
                reopenReason,
                (reason) => (p, r) => reopenTenancyReviewNegotiation(p, r, { reason }),
                COPY.reopened,
                () => setReopenReason(''),
              )
            }
          >
            {pending === 'reopen' ? COPY.busy : COPY.reopen}
          </Button>
        </Section>
      ) : null}

      {actions.close ? (
        <Section title={COPY.closeTitle} hint={COPY.closeHint}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`close-outcome-${detail.id}`}>{COPY.closeOutcome}</Label>
              <select
                id={`close-outcome-${detail.id}`}
                className={NATIVE_SELECT_CLASS}
                value={closeForm.outcome}
                disabled={busy}
                onChange={(e) =>
                  setCloseForm((f) => ({ ...f, outcome: e.target.value as TenancyReviewCloseOutcome }))
                }
              >
                {Object.values(TENANCY_REVIEW_CLOSE_OUTCOME).map((value) => (
                  <option key={value} value={value}>
                    {COPY.closeOutcomeLabel[value]}
                  </option>
                ))}
              </select>
            </div>
            {increased ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor={`close-weekly-${detail.id}`}>{COPY.closeWeekly}</Label>
                  <Input
                    id={`close-weekly-${detail.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={closeForm.newWeeklyRent}
                    disabled={busy}
                    onChange={(e) => setCloseForm((f) => ({ ...f, newWeeklyRent: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`close-effective-${detail.id}`}>{COPY.closeEffective}</Label>
                  <Input
                    id={`close-effective-${detail.id}`}
                    type="date"
                    value={closeForm.effectiveDate}
                    disabled={busy}
                    onChange={(e) => setCloseForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  />
                </div>
              </>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`close-note-${detail.id}`}>{COPY.closeNote}</Label>
            <Textarea
              id={`close-note-${detail.id}`}
              rows={2}
              value={closeForm.note}
              disabled={busy}
              onChange={(e) => setCloseForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={closeReview}>
              {pending === 'close' ? COPY.busy : COPY.close}
            </Button>
            {actions.postpone ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run('postpone', (p, r) => postponeTenancyReview(p, r), COPY.postponed)}
              >
                {pending === 'postpone' ? COPY.busy : COPY.postpone}
              </Button>
            ) : null}
          </div>
        </Section>
      ) : null}
    </section>
  );
}
