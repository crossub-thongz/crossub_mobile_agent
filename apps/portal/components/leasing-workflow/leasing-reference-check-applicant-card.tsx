'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { CaseNestedDialog } from '@/components/agent/case-nested-dialog';
import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import {
  applicantAuditEntries,
  applicantEmailRecords,
} from '@/lib/leasing/applicant-reference-check';
import { applicantOrderTitle } from '@/lib/leasing/applicant-order';
import { enrichLeasingEmailRecords } from '@/lib/leasing/agent-workflow-email';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_DECISION_LABEL,
  LEASING_AGENT_DECISION_TONE,
  LEASING_TONE,
  LEASING_UI,
} from '@/lib/leasing/constants';
import type { ReferenceCheckRecommendation } from '@/lib/leasing/reference-check-draft';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { resolveRentReviewAgentEmail } from '@/lib/rent-review/agent-email';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

function ChoiceButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-muted/60',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {children}
    </button>
  );
}

export function LeasingReferenceCheckApplicantCard({
  app,
  detail,
  cycleId,
  propertyId,
  apiConnected,
  chosenApplicantId,
  onChooseApplicant,
  onCaseClosed,
}: {
  app: LeasingApplicationDetail;
  detail: LeasingPropertyDetail;
  cycleId?: string;
  propertyId: string;
  apiConnected: boolean;
  chosenApplicantId: string | null;
  onChooseApplicant: (applicationId: string) => void;
  onCaseClosed?: () => void;
}) {
  const { user } = useAuth();
  const { agencies, properties } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const property = properties.find((p) => p.id === detail.propertyId);
  const agency = agencies.find((a) => a.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail ?? detail.agentInfo.email,
  });

  const [notes, setNotes] = useState(app.feedback ?? '');
  const [recommendation, setRecommendation] = useState<ReferenceCheckRecommendation | undefined>(
    app.referenceRecommendation,
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const [weeklyRent, setWeeklyRent] = useState(
    String(detail.onboarding.agreement.contract.weeklyRent ?? detail.rental.rentPerWeek ?? ''),
  );
  const [startDate, setStartDate] = useState(
    detail.onboarding.agreement.contract.startDate?.slice(0, 10) ??
      detail.rental.availableFrom?.slice(0, 10) ??
      '',
  );
  const [leaseTerm, setLeaseTerm] = useState(
    detail.onboarding.agreement.contract.leaseTerm ?? detail.rental.leaseTerm ?? '52 weeks',
  );
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setNotes(app.feedback ?? '');
    setRecommendation(app.referenceRecommendation);
  }, [app.feedback, app.referenceRecommendation, app.id]);

  const alreadySent = Boolean(app.feedbackSentAt);
  const pending = app.agentDecision === LEASING_AGENT_DECISION.PENDING && !alreadySent;
  const isChosen = chosenApplicantId === app.id;

  const stageEmails = useMemo(
    () =>
      enrichLeasingEmailRecords(
        applicantEmailRecords(detail, app),
        agentEmail,
        detail.agentInfo.name,
      ),
    [agentEmail, app, detail],
  );
  const auditEntries = useMemo(() => applicantAuditEntries(detail, app), [app, detail]);

  const saveDraft = async (
    nextNotes: string,
    nextRecommendation?: ReferenceCheckRecommendation,
  ) => {
    if (!apiConnected || !cycleId || alreadySent) return;
    setSavingDraft(true);
    try {
      const view = await leasingOpsApi.setApplicantFeedback(cycleId, app.id, {
        feedback: nextNotes,
        recommendation: nextRecommendation,
      });
      applyCycleView(propertyId, view);
      toast.success('Reference check notes saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save notes');
    } finally {
      setSavingDraft(false);
    }
  };

  const sendDecision = async (decision: 'approved' | 'rejected') => {
    if (!apiConnected || !cycleId || alreadySent) return;
    setBusy(true);
    try {
      const rent = Number(weeklyRent);
      const view = await leasingOpsApi.sendApplicantResultsDecision(cycleId, app.id, {
        decision,
        feedback: decision === 'approved' ? notes.trim() || undefined : undefined,
        rejectReason: decision === 'rejected' ? rejectReason.trim() || undefined : undefined,
        weeklyRent: decision === 'approved' && Number.isFinite(rent) ? rent : undefined,
        startDate: decision === 'approved' && startDate ? startDate : undefined,
        leaseTerm: decision === 'approved' && leaseTerm.trim() ? leaseTerm.trim() : undefined,
      });
      applyCycleView(propertyId, view);
      if (!view.isActive) {
        onCaseClosed?.();
        toast.success('All applicant results sent — new leasing case closed');
      } else {
        toast.success(
          decision === 'approved'
            ? `${app.applicant} approved — candidate notified`
            : `Reject email sent to ${app.applicant}`,
        );
      }
      setApproveOpen(false);
      setRejectOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send results');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="bg-card space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{applicantOrderTitle(app.applicant)}</p>
            {recommendation === 'recommend' ? (
              <LeasingToneBadge tone={LEASING_TONE.SUCCESS} label="Recommend" size="xs" />
            ) : null}
            {recommendation === 'reject' ? (
              <LeasingToneBadge tone={LEASING_TONE.DESTRUCTIVE} label="Rejected" size="xs" />
            ) : null}
            {!recommendation && pending ? (
              <LeasingToneBadge tone={LEASING_TONE.WARNING} label="Pending review" size="xs" />
            ) : null}
            {!pending || alreadySent ? (
              <LeasingToneBadge
                tone={LEASING_AGENT_DECISION_TONE[app.agentDecision]}
                label={LEASING_AGENT_DECISION_LABEL[app.agentDecision]}
                size="xs"
              />
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Applied {formatDateTime(app.submittedAt)}
            {app.email ? ` · ${app.email}` : ''}
            {app.phone ? ` · ${app.phone}` : ''}
          </p>
        </div>

        {pending ? (
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="radio"
              name={`chosen-applicant-${propertyId}`}
              checked={isChosen}
              onChange={() => onChooseApplicant(app.id)}
            />
            Approve this applicant
          </label>
        ) : null}
      </div>

      {pending ? (
        <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
          <div>
            <Label className="text-xs">Reference check notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Landlord reference, employment checks, observations…"
              className="mt-1.5 min-h-20 text-sm"
              disabled={savingDraft || busy}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Recommendation</Label>
            <div className="flex gap-2">
              <ChoiceButton
                active={recommendation === 'recommend'}
                disabled={savingDraft || busy}
                onClick={() => {
                  setRecommendation('recommend');
                  void saveDraft(notes, 'recommend');
                }}
              >
                Recommend
              </ChoiceButton>
              <ChoiceButton
                active={recommendation === 'reject'}
                disabled={savingDraft || busy}
                onClick={() => {
                  setRecommendation('reject');
                  void saveDraft(notes, 'reject');
                }}
              >
                Reject
              </ChoiceButton>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={savingDraft || busy}
            onClick={() => void saveDraft(notes, recommendation)}
          >
            {savingDraft ? 'Saving…' : 'Save notes'}
          </Button>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              type="button"
              size="sm"
              className={cn('gap-1.5', LEASING_UI.btnSuccess)}
              disabled={!apiConnected || busy || !isChosen}
              onClick={() => setApproveOpen(true)}
            >
              <Check className="size-3.5" />
              Approve &amp; confirm lease
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8 gap-1 text-xs hover:text-rose-600"
              disabled={!apiConnected || busy}
              onClick={() => setRejectOpen(true)}
            >
              <X className="size-3.5" />
              Send reject
            </Button>
          </div>
          {isChosen ? (
            <p className="text-muted-foreground text-[11px]">
              Selected for approval — confirm rent and lease terms in the dialog.
            </p>
          ) : (
            <p className="text-muted-foreground text-[11px]">
              Select this applicant above to approve with confirmed lease terms.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/10 px-3 py-2.5 text-[11px]">
          {alreadySent ? (
            <p className="text-emerald-700 dark:text-emerald-400">
              Results sent
              {app.feedbackSentAt ? ` · ${formatDateTime(app.feedbackSentAt)}` : ''}
            </p>
          ) : (
            <p className="text-muted-foreground">Decision recorded.</p>
          )}
          {notes ? <p className="mt-2 whitespace-pre-wrap">{notes}</p> : null}
        </div>
      )}

      <JobCaseStageEmailHistory emails={stageEmails} title="Email history" />

      <div className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setAuditExpanded((value) => !value)}
          aria-expanded={auditExpanded}
        >
          <span className="text-sm font-medium">Audit</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {auditEntries.length} event{auditEntries.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', auditExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {auditExpanded ? (
          <ul className="divide-y border-t px-3 py-1">
            {auditEntries.length === 0 ? (
              <li className="text-muted-foreground py-3 text-xs">No audit events for this applicant yet.</li>
            ) : (
              auditEntries.map((entry) => (
                <li key={entry.id} className="py-2.5 text-xs">
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {entry.actor} · {formatDateTime(entry.at)}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <CaseNestedDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={`Approve ${app.applicant}`}
        description={
          <>
            Confirm lease terms for the chosen tenant. They will be notified by email
            {app.email ? ` at ${app.email}` : ''}.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`rent-${app.id}`}>Rent / week</Label>
            <Input
              id={`rent-${app.id}`}
              type="number"
              min={0}
              step="1"
              value={weeklyRent}
              onChange={(e) => setWeeklyRent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`start-${app.id}`}>Lease start date</Label>
            <Input
              id={`start-${app.id}`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`term-${app.id}`}>Lease term</Label>
            <Input
              id={`term-${app.id}`}
              value={leaseTerm}
              onChange={(e) => setLeaseTerm(e.target.value)}
              placeholder="e.g. 52 weeks"
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Confirmed rent:{' '}
          <span className="text-foreground font-medium tabular-nums">
            {weeklyRent ? `${formatCurrency(Number(weeklyRent))}/wk` : '—'}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void sendDecision('approved')}>
            Approve &amp; notify
          </Button>
        </div>
      </CaseNestedDialog>

      <CaseNestedDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${app.applicant}`}
        description={<>Send a decline email to this applicant. You can include an optional reason.</>}
      >
        <Input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Optional reason (included in email)"
          className="text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void sendDecision('rejected')}
          >
            Send reject email
          </Button>
        </div>
      </CaseNestedDialog>
    </li>
  );
}
