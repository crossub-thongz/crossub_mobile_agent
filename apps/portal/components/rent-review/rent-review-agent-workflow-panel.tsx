'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { WorkflowProgressRail } from '@/components/agent/workflow-progress-rail';
import type { CommSendDraft } from '@/components/rent-review/rent-review-email-log';
import { RentReviewAgentConfirmedPanel } from '@/components/rent-review/rent-review-agent-confirmed-panel';
import { RentReviewCompletedPanel } from '@/components/rent-review/rent-review-completed-panel';
import { RentReviewResearchPanel } from '@/components/rent-review/rent-review-research-panel';
import { RentReviewStageEmailHistory } from '@/components/rent-review/rent-review-email-log';
import { RentReviewNegotiationPanel } from '@/components/rent-review/rent-review-negotiation-panel';
import { RentReviewTenantDecisionPanel } from '@/components/rent-review/rent-review-tenant-decision-panel';
import { RentReviewTenantNotifiedPanel } from '@/components/rent-review/rent-review-tenant-notified-panel';
import {
  RENT_REVIEW_AGENT_STEP,
  RENT_REVIEW_AGENT_STEP_LABEL,
  RENT_REVIEW_AGENT_STEP_ORDER,
  buildRentReviewAgentWorkflow,
  emailRecordsForStep,
  isRentReviewWorkflowClosed,
  type RentReviewAgentStep,
} from '@/lib/rent-review/agent-workflow-model';
import { resolveCommInReplyToAuditId } from '@/lib/rent-review/communications';
import {
  applyManagingAgentFromEmail,
  resolveRentReviewAgentEmail,
} from '@/lib/rent-review/agent-email';
import { buildPropertyWorkflowEmailContacts } from '@/lib/job-case-email-recipients';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function StepContent({
  stepId,
  detail,
  onUpdated,
  onNavigateToStep,
  readOnly,
}: {
  stepId: RentReviewAgentStep;
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
  onNavigateToStep?: (step: RentReviewAgentStep) => void;
  readOnly?: boolean;
}) {
  switch (stepId) {
    case RENT_REVIEW_AGENT_STEP.RENT_RESEARCH:
      return <RentReviewResearchPanel detail={detail} onUpdated={onUpdated} />;
    case RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED:
      return <RentReviewAgentConfirmedPanel detail={detail} onUpdated={onUpdated} readOnly={readOnly} />;
    case RENT_REVIEW_AGENT_STEP.TENANT_NOTIFIED:
      return <RentReviewTenantNotifiedPanel detail={detail} onUpdated={onUpdated} readOnly={readOnly} />;
    case RENT_REVIEW_AGENT_STEP.NEGOTIATION:
      return <RentReviewNegotiationPanel detail={detail} onUpdated={onUpdated} readOnly={readOnly} />;
    case RENT_REVIEW_AGENT_STEP.TENANT_DECISION:
      return <RentReviewTenantDecisionPanel detail={detail} onUpdated={onUpdated} readOnly={readOnly} />;
    case RENT_REVIEW_AGENT_STEP.COMPLETED:
      return (
        <RentReviewCompletedPanel
          detail={detail}
          onUpdated={onUpdated}
          onNavigateToStep={onNavigateToStep}
          readOnly={readOnly}
        />
      );
    default:
      return null;
  }
}

export function RentReviewAgentWorkflowPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const { properties, agencies } = useAgentData();
  const { user } = useAuth();
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const property = properties.find((p) => p.id === detail.propertyId);
  const agency = agencies.find((a) => a.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail,
  });
  const recipientContacts = useMemo(
    () => buildPropertyWorkflowEmailContacts(property, { tenantName: detail.tenantName, agentEmail }),
    [property, detail.tenantName, agentEmail],
  );
  const workflow = useMemo(() => buildRentReviewAgentWorkflow(detail), [detail]);
  const [viewingStepId, setViewingStepId] = useState<RentReviewAgentStep>(workflow.liveStepId);
  const [sendingComm, setSendingComm] = useState(false);
  const initializedRef = useRef<string | null>(null);
  const followLiveStepRef = useRef(true);

  useEffect(() => {
    if (initializedRef.current !== detail.id) {
      setViewingStepId(workflow.liveStepId);
      initializedRef.current = detail.id;
      followLiveStepRef.current = true;
      return;
    }

    if (followLiveStepRef.current) {
      setViewingStepId(workflow.liveStepId);
    }
  }, [detail.id, workflow.liveStepId]);

  const handleStepClick = (stepId: RentReviewAgentStep) => {
    setViewingStepId(stepId);
    followLiveStepRef.current = stepId === workflow.liveStepId;
  };

  const handleAuditNavigate = (stepId: RentReviewAgentStep) => {
    handleStepClick(stepId);
  };

  const viewingStep = workflow.steps.find((s) => s.id === viewingStepId) ?? workflow.steps[0];
  const isLiveStep = viewingStepId === workflow.liveStepId;
  const workflowClosed = isRentReviewWorkflowClosed(detail);
  const stageEmails = useMemo(
    () => applyManagingAgentFromEmail(emailRecordsForStep(detail, viewingStepId), agentEmail),
    [detail, viewingStepId, agentEmail],
  );

  const handleCommSend = async (draft: CommSendDraft) => {
    if (!detail.propertyId) {
      toast.error('Property is required to send email');
      return;
    }
    if (!draft.toEmail?.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSendingComm(true);
    try {
      const updated = await runMutation(
        detail.id,
        rentReviewApi.sendEmail(
          detail.id,
          {
            toEmail: draft.toEmail.trim(),
            toName: draft.to.trim() || undefined,
            subject: draft.subject.trim(),
            body: draft.body.trim(),
            kind: draft.mode === 'reply' ? 'comm_reply' : 'comm_forward',
            inReplyToAuditId: resolveCommInReplyToAuditId(draft.inReplyTo?.id),
            channel: 'email',
          },
          detail.propertyId,
          detail.leaseEndDate,
        ),
      );
      onUpdated?.(updated);
      toast.success(draft.mode === 'reply' ? 'Reply sent' : 'Message forwarded');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSendingComm(false);
    }
  };

  const emailHistoryTitle =
    viewingStepId === RENT_REVIEW_AGENT_STEP.COMPLETED
      ? 'All e-mail'
      : 'Email/message history';

  const enableCommCompose = false;

  const agentEditableSteps: RentReviewAgentStep[] = [
    RENT_REVIEW_AGENT_STEP.RENT_RESEARCH,
    RENT_REVIEW_AGENT_STEP.AGENT_CONFIRMED,
  ];
  const stepReadOnly = !agentEditableSteps.includes(viewingStepId);

  return (
    <div className="space-y-4">
      <WorkflowProgressRail
        steps={RENT_REVIEW_AGENT_STEP_ORDER}
        labels={RENT_REVIEW_AGENT_STEP_LABEL}
        currentStep={viewingStepId}
        progressFillIndex={isLiveStep ? workflow.progressFillIndex : undefined}
        getStepState={(stepId) => {
          const step = workflow.steps.find((s) => s.id === stepId);
          if (!step) return 'upcoming';
          if (stepId === viewingStepId) return 'current';
          if (step.status === 'done') return 'completed';
          if (step.status === 'active') return 'current';
          return 'upcoming';
        }}
        isStepCompleted={(stepId) =>
          workflow.steps.find((s) => s.id === stepId)?.status === 'done'
        }
        isStepEnabled={(stepId) => {
          if (workflowClosed) return true;
          const step = workflow.steps.find((s) => s.id === stepId);
          return step != null && step.status !== 'upcoming';
        }}
        onStepClick={handleStepClick}
      />

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {isLiveStep ? 'Current step' : 'Step detail'}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{RENT_REVIEW_AGENT_STEP_LABEL[viewingStepId]}</p>
          {isLiveStep && viewingStep?.workflowName ? (
            <p className="text-muted-foreground mt-1 text-xs">{viewingStep.workflowName}</p>
          ) : null}
        </div>
        <div className="space-y-4 p-4">
          <StepContent
            stepId={viewingStepId}
            detail={detail}
            onUpdated={onUpdated}
            onNavigateToStep={handleAuditNavigate}
            readOnly={stepReadOnly}
          />
          <RentReviewStageEmailHistory
            emails={stageEmails}
            title={emailHistoryTitle}
            onSend={enableCommCompose && !sendingComm ? handleCommSend : undefined}
            enableComposeActions={enableCommCompose && !sendingComm}
            recipientContacts={recipientContacts}
          />
        </div>
      </div>
    </div>
  );
}
