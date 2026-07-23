'use client';

import { useState } from 'react';
import { CalendarClock, ChevronDown, Inbox, Send } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingApplicantAddPanel } from '@/components/leasing-workflow/leasing-applicant-add-panel';
import { LeasingApplicantDocumentIntake } from '@/components/leasing-workflow/leasing-applicant-document-intake';
import { LeasingApplicantOrderCard } from '@/components/leasing-workflow/leasing-applicant-order-card';
import { OpenInspectionApplicantLinksPanel } from '@/components/open-inspection/open-inspection-applicant-links-panel';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_SELF_OPEN_LABEL,
  LEASING_APPLICATION_SEND_FOR_APPROVAL_LABEL,
  LEASING_UI,
} from '@/lib/leasing/constants';
import {
  getApprovedApplications,
  countSelectedForApprovalSend,
  isApplicationApprovalLocked,
} from '@/lib/leasing/lifecycle';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDateTime } from '@/lib/utils';

export function LeasingStepApplicationApproval({ detail }: { detail: LeasingPropertyDetail }) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const toggleSelectedLocal = useLeasingWorkflowStore((s) => s.toggleApplicantSelected);
  const sendSelectedLocal = useLeasingWorkflowStore((s) => s.sendSelectedToAgent);
  const setDecisionLocal = useLeasingWorkflowStore((s) => s.setApplicantDecision);

  const [sendingSelected, setSendingSelected] = useState(false);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = detail.cycleId ?? cycle?.id;

  const readOnly = isApplicationApprovalLocked(detail);
  const apps = readOnly ? getApprovedApplications(detail) : detail.applicationsDetail;
  const selectedCount = countSelectedForApprovalSend(apps);

  const agentConductedLinks =
    detail.openInspection.agentConducted && detail.openInspection.viewingSessionId ? (
      <OpenInspectionApplicantLinksPanel
        propertyId={detail.propertyId}
        viewingSessionId={detail.openInspection.viewingSessionId}
        apiConnected={apiConnected}
      />
    ) : null;

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

  const setDecision = async (
    applicationId: string,
    decision: typeof LEASING_AGENT_DECISION.APPROVED | typeof LEASING_AGENT_DECISION.REJECTED,
  ) => {
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

  const intakeSection = !readOnly ? (
    <div className="space-y-3">
      <LeasingApplicantDocumentIntake
        propertyId={detail.propertyId}
        cycleId={cycleId}
        applications={detail.applicationsDetail}
      />
      <div className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setShowContactForm((value) => !value)}
          aria-expanded={showContactForm}
        >
          <span className="text-sm font-medium">Add applicant with contact details</span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              showContactForm && 'rotate-180',
            )}
          />
        </button>
        {showContactForm ? (
          <div className="border-t px-1 pb-1">
            <LeasingApplicantAddPanel propertyId={detail.propertyId} className="border-0 shadow-none" />
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  if (detail.applicationsDetail.length === 0) {
    if (detail.openInspection.pushedToAgentApp) {
      return (
        <div className="space-y-3">
          {agentConductedLinks}
          {intakeSection}
          <div className="border-primary/30 bg-primary/5 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">
                  {detail.openInspection.agentConducted
                    ? LEASING_AGENT_SELF_OPEN_LABEL
                    : 'Open inspection is live — find tenants'}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {detail.openInspection.agentConducted
                    ? 'You opened this letting with a self-run open inspection. Share the check-in and application links (or QR codes) below with prospects, drag in application documents above, or wait for viewers to apply via the tenant app.'
                    : 'CROSSUB pushed the arranged viewing time to your app. Drag in application documents above, or wait for viewers to apply via the CROSSUB app / H5 form.'}
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center">
            <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
              <Inbox className="text-muted-foreground size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">No applicant orders yet</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              Drop application documents above and confirm to create Applicant 1. Each confirmed
              bundle becomes its own applicant order.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {agentConductedLinks}
        {intakeSection}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
          <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
            <Inbox className="text-muted-foreground size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">No applicant orders yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Drag in application documents above and confirm to create Applicant 1, or wait for
            viewers to apply via the CROSSUB app or H5 form after the open report.
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
      {agentConductedLinks}
      {intakeSection}

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
            applicant order{apps.length === 1 ? '' : 's'} ·{' '}
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
          <LeasingApplicantOrderCard
            key={app.id}
            app={app}
            propertyId={detail.propertyId}
            cycleId={cycleId}
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
