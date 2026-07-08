'use client';

import { useState } from 'react';
import { CalendarClock, Check, Inbox, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingApplicantAddPanel } from '@/components/leasing-workflow/leasing-applicant-add-panel';
import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_DECISION_LABEL,
  LEASING_AGENT_DECISION_TONE,
  LEASING_APPLICATION_SEND_FOR_APPROVAL_LABEL,
  LEASING_TONE,
  LEASING_UI,
} from '@/lib/leasing/constants';
import {
  getApprovedApplications,
  canSelectApplicantForApproval,
  countSelectedForApprovalSend,
  isApplicationApprovalLocked,
} from '@/lib/leasing/lifecycle';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const AI_TONE = {
  strong: LEASING_TONE.SUCCESS,
  medium: LEASING_TONE.WARNING,
  risk: LEASING_TONE.DESTRUCTIVE,
} as const;

export function LeasingStepApplicationApproval({ detail }: { detail: LeasingPropertyDetail }) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const toggleSelectedLocal = useLeasingWorkflowStore((s) => s.toggleApplicantSelected);
  const sendSelectedLocal = useLeasingWorkflowStore((s) => s.sendSelectedToAgent);
  const setDecisionLocal = useLeasingWorkflowStore((s) => s.setApplicantDecision);

  const [sendingSelected, setSendingSelected] = useState(false);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const readOnly = isApplicationApprovalLocked(detail);
  const apps = readOnly ? getApprovedApplications(detail) : detail.applicationsDetail;
  const selectedCount = countSelectedForApprovalSend(apps);

  const toggleSelected = async (applicationId: string) => {
    setBusyAppId(applicationId);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.toggleApplicantSelected(cycleId, applicationId);
        applyCycleView(detail.propertyId, view);
      } else {
        toggleSelectedLocal(detail.propertyId, applicationId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update selection');
    } finally {
      setBusyAppId(null);
    }
  };

  const sendSelected = async () => {
    setSendingSelected(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.sendSelectedToAgent(cycleId);
        applyCycleView(detail.propertyId, view);
      } else {
        sendSelectedLocal(detail.propertyId);
      }
      toast.success(
        `${selectedCount} applicant${selectedCount === 1 ? '' : 's'} + AI advice sent for approval`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send for approval');
    } finally {
      setSendingSelected(false);
    }
  };

  const setDecision = async (applicationId: string, decision: typeof LEASING_AGENT_DECISION.APPROVED | typeof LEASING_AGENT_DECISION.REJECTED) => {
    setBusyAppId(applicationId);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.setApplicantDecision(cycleId, applicationId, {
          decision,
        });
        applyCycleView(detail.propertyId, view);
      } else {
        setDecisionLocal(detail.propertyId, applicationId, decision);
      }
      if (decision === LEASING_AGENT_DECISION.APPROVED) {
        const app = apps.find((a) => a.id === applicationId);
        toast.success(`${app?.applicant ?? 'Applicant'} approved`);
      } else {
        const app = apps.find((a) => a.id === applicationId);
        toast(`${app?.applicant ?? 'Applicant'} rejected`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update decision');
    } finally {
      setBusyAppId(null);
    }
  };

  if (detail.applicationsDetail.length === 0) {
    if (detail.openInspection.pushedToAgentApp) {
      return (
        <div className="space-y-3">
          <LeasingApplicantAddPanel propertyId={detail.propertyId} />
          <div className="border-primary/30 bg-primary/5 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Open inspection is live — find tenants</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  CROSSUB pushed the arranged viewing time to your app. Advertise the property,
                  run the open inspection, and submit applicant profiles here when you have
                  candidates ready for approval.
                </p>
                {detail.openInspection.scheduledTime ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Scheduled viewing · </span>
                    <span className="font-medium">
                      {formatDateTime(detail.openInspection.scheduledTime)}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
            <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
              <Inbox className="text-muted-foreground size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No applicants submitted yet</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Add manual applicants above or wait for viewers to apply via the CROSSUB app / H5 form
              after the open report. You will shortlist and send them to CROSSUB from here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <LeasingApplicantAddPanel propertyId={detail.propertyId} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
            <Inbox className="text-muted-foreground size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">No applications yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Add an applicant above, or wait for viewers to apply via the CROSSUB app or H5 form after
            the open report (step 2).
          </p>
        </div>
      </div>
    );
  }

  if (readOnly && apps.length === 0) {
    return (
      <div className="bg-card rounded-xl border px-4 py-6 text-center">
        <p className="text-sm font-medium">No approved tenant on record</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && <LeasingApplicantAddPanel propertyId={detail.propertyId} />}

      {readOnly ? (
        <div className="bg-card rounded-xl border px-4 py-2.5">
          <p className="text-muted-foreground text-[12px]">
            Application approval is complete. The approved tenant is shown for reference — decisions
            cannot be changed.
          </p>
        </div>
      ) : (
        <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5">
          <p className="text-muted-foreground text-[12px]">
            <span className="text-foreground font-semibold tabular-nums">{apps.length}</span>{' '}
            application{apps.length === 1 ? '' : 's'} ·{' '}
            <span className="text-foreground font-semibold tabular-nums">{selectedCount}</span>{' '}
            selected
          </p>
          <Button
            size="sm"
            className={cn('gap-1.5', LEASING_UI.btnSecondary, 'disabled:opacity-40')}
            variant="ghost"
            disabled={selectedCount === 0 || sendingSelected}
            onClick={() => void sendSelected()}
          >
            <Send className="size-3.5" />
            {sendingSelected ? 'Sending…' : LEASING_APPLICATION_SEND_FOR_APPROVAL_LABEL}
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {apps.map((app) => (
          <ApplicantRow
            key={app.id}
            app={app}
            readOnly={readOnly}
            busy={busyAppId === app.id}
            onToggle={() => void toggleSelected(app.id)}
            onApprove={() => void setDecision(app.id, LEASING_AGENT_DECISION.APPROVED)}
            onReject={() => void setDecision(app.id, LEASING_AGENT_DECISION.REJECTED)}
          />
        ))}
      </ul>
    </div>
  );
}

function ApplicantRow({
  app,
  readOnly = false,
  busy = false,
  onToggle,
  onApprove,
  onReject,
}: {
  app: LeasingApplicationDetail;
  readOnly?: boolean;
  busy?: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const decisionPending = app.agentDecision === LEASING_AGENT_DECISION.PENDING;
  const canSelect = canSelectApplicantForApproval(app);

  return (
    <li className="bg-card rounded-xl border p-3.5">
      <div className="flex items-start gap-3">
        {!readOnly && canSelect && (
          <input
            type="checkbox"
            checked={app.selectedForAgent}
            onChange={onToggle}
            disabled={busy}
            className="mt-1"
            aria-label={`Select ${app.applicant}`}
          />
        )}
        {!readOnly && !canSelect && <span className="mt-1 inline-flex size-4 shrink-0" aria-hidden />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-semibold">{app.applicant}</p>
            {app.aiScoreLevel && (
              <LeasingToneBadge
                tone={AI_TONE[app.aiScoreLevel]}
                label={`AI ${app.aiScoreLevel}${app.aiScore ? ` · ${app.aiScore}` : ''}`}
                size="xs"
              />
            )}
            {(readOnly || !decisionPending) && (
              <LeasingToneBadge
                tone={LEASING_AGENT_DECISION_TONE[app.agentDecision]}
                label={LEASING_AGENT_DECISION_LABEL[app.agentDecision]}
                size="xs"
              />
            )}
            {!readOnly && app.sentToAgent && decisionPending && (
              <LeasingToneBadge tone={LEASING_TONE.INFO} label="Sent for approval" size="xs" />
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px]">
            {typeof app.annualIncome === 'number' && (
              <span className="tabular-nums">{formatCurrency(app.annualIncome)}/yr</span>
            )}
            {app.employmentStatus && (
              <span className="capitalize">{app.employmentStatus.replace('_', ' ')}</span>
            )}
            <span>Applied {formatDateTime(app.submittedAt)}</span>
          </p>
          {app.aiAdvice && (
            <p
              className={cn(
                'mt-1.5 flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px]',
                LEASING_UI.callout,
              )}
            >
              <Sparkles className={cn('mt-0.5 size-3 shrink-0', LEASING_UI.accentIcon)} />
              <span className="min-w-0">{app.aiAdvice}</span>
            </p>
          )}
        </div>
        {!readOnly && app.agentDecision === LEASING_AGENT_DECISION.PENDING && (
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={cn('h-7 gap-1 px-2 text-xs', LEASING_UI.btnSuccess)}
              disabled={busy}
              onClick={onApprove}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground size-7 p-0 hover:bg-rose-500/10 hover:text-rose-800"
              disabled={busy}
              onClick={onReject}
              aria-label="Reject"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
