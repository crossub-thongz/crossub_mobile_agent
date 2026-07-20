'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { WorkflowProgressRail } from '@/components/agent/workflow-progress-rail';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { MaintenanceGetQuotePanel } from '@/components/maintenance/maintenance-get-quote-panel';
import { MaintenanceJobIntakeSummary } from '@/components/maintenance/maintenance-job-intake-summary';
import { MaintenanceJobTypeSummary } from '@/components/maintenance/maintenance-job-type-summary';
import { MaintenanceInProgressPanel } from '@/components/maintenance/maintenance-in-progress-panel';
import { MaintenanceJobCompletedPanel } from '@/components/maintenance/maintenance-job-completed-panel';
import { MaintenanceJobCreatedPanel } from '@/components/maintenance/maintenance-job-created-panel';
import { MaintenanceReviewPanel } from '@/components/maintenance/maintenance-review-panel';
import { MaintenanceStepAudit } from '@/components/maintenance/maintenance-step-audit';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import type { MaintenanceRequest, Property } from '@/lib/types';
import {
  buildMaintenanceAgentWorkflow,
  MAINTENANCE_AGENT_STEP,
  MAINTENANCE_AGENT_STEP_LABEL,
  MAINTENANCE_AGENT_STEP_ORDER,
  MAINTENANCE_AGENT_STEP_TITLE,
  maintenanceEmailRecordsForStep,
  type MaintenanceAgentStep,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { cn } from '@/lib/utils';

function StepContent({
  stepId,
  ctx,
  property,
  attachments,
  contractors = [],
  onCaseUpdated,
  apiConnected,
}: {
  stepId: MaintenanceAgentStep;
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  attachments: ApiMaintenanceAttachment[];
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  switch (stepId) {
    case MAINTENANCE_AGENT_STEP.JOB_CREATED:
      return <MaintenanceJobCreatedPanel ctx={ctx} />;
    case MAINTENANCE_AGENT_STEP.REVIEW:
      return (
        <MaintenanceReviewPanel
          ctx={ctx}
          property={property}
          attachments={attachments}
          onCaseUpdated={onCaseUpdated}
          apiConnected={apiConnected}
        />
      );
    case MAINTENANCE_AGENT_STEP.GET_QUOTE:
      return (
        <MaintenanceGetQuotePanel
          ctx={ctx}
          property={property}
          contractors={contractors}
          onCaseUpdated={onCaseUpdated}
          apiConnected={apiConnected}
        />
      );
    case MAINTENANCE_AGENT_STEP.IN_PROGRESS:
      return (
        <MaintenanceInProgressPanel
          ctx={ctx}
          property={property}
          attachments={attachments}
          onCaseUpdated={onCaseUpdated}
          apiConnected={apiConnected}
        />
      );
    case MAINTENANCE_AGENT_STEP.JOB_COMPLETED:
      return (
        <MaintenanceJobCompletedPanel
          ctx={ctx}
          attachments={attachments}
          contractors={contractors}
          onCaseUpdated={onCaseUpdated}
        />
      );
    default:
      return null;
  }
}

export function MaintenanceAgentWorkflowPanel({
  ctx,
  item,
  property,
  attachments = [],
  contractors = [],
  onCaseUpdated,
  apiConnected = true,
  syncing = false,
}: {
  ctx: MaintenanceWorkflowContext;
  item: MaintenanceRequest;
  property?: Property;
  attachments?: ApiMaintenanceAttachment[];
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
  syncing?: boolean;
}) {
  const workflow = useMemo(() => buildMaintenanceAgentWorkflow(ctx), [ctx]);
  const [viewingStepId, setViewingStepId] = useState<MaintenanceAgentStep>(workflow.liveStepId);
  const initializedRef = useRef<string | null>(null);
  const followLiveStepRef = useRef(true);

  useEffect(() => {
    if (initializedRef.current !== ctx.item.id) {
      setViewingStepId(workflow.liveStepId);
      initializedRef.current = ctx.item.id;
      followLiveStepRef.current = true;
      return;
    }

    if (followLiveStepRef.current) {
      setViewingStepId(workflow.liveStepId);
    }
  }, [ctx.item.id, workflow.liveStepId]);

  const handleStepClick = (stepId: MaintenanceAgentStep) => {
    setViewingStepId(stepId);
    followLiveStepRef.current = stepId === workflow.liveStepId;
  };

  const viewingStep = workflow.steps.find((s) => s.id === viewingStepId) ?? workflow.steps[0];
  const isLiveStep = viewingStepId === workflow.liveStepId;
  const stageEmails = useMemo(
    () => maintenanceEmailRecordsForStep(ctx, viewingStepId),
    [ctx, viewingStepId],
  );

  return (
    <div className="space-y-4">
      <WorkflowProgressRail
        steps={MAINTENANCE_AGENT_STEP_ORDER}
        labels={MAINTENANCE_AGENT_STEP_LABEL}
        currentStep={viewingStepId}
        liveStep={workflow.liveStepId}
        progressFillIndex={isLiveStep ? workflow.progressFillIndex : undefined}
        getStepState={(stepId) => {
          const step = workflow.steps.find((s) => s.id === stepId);
          if (!step) return 'upcoming';
          if (stepId === viewingStepId) return 'current';
          if (step.status === 'done') return 'completed';
          return 'upcoming';
        }}
        isStepCompleted={(stepId) =>
          workflow.steps.find((s) => s.id === stepId)?.status === 'done'
        }
        isStepEnabled={(stepId) => {
          const step = workflow.steps.find((s) => s.id === stepId);
          return step != null && step.status !== 'upcoming';
        }}
        onStepClick={handleStepClick}
      />

      <MaintenanceJobTypeSummary
        item={item}
        workflowCtx={ctx}
        property={property}
        syncing={syncing}
      />

      <MaintenanceJobIntakeSummary
        ctx={ctx}
        attachments={attachments}
        // Review step has its own evidence panel — avoid showing the same photos twice.
        hideEvidence={viewingStepId === MAINTENANCE_AGENT_STEP.REVIEW}
      />

      <div className="rounded-xl border bg-card">
        <div
          className={cn(
            'border-b px-4 py-3',
            isLiveStep ? 'bg-primary/[0.04]' : 'bg-amber-500/[0.06]',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isLiveStep ? 'text-primary' : 'text-amber-700 dark:text-amber-300',
                )}
              >
                {isLiveStep ? 'Current step' : 'Viewing step'}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {MAINTENANCE_AGENT_STEP_TITLE[viewingStepId]}
              </p>
              {!isLiveStep ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Live step:{' '}
                  <span className="text-foreground font-medium">
                    {MAINTENANCE_AGENT_STEP_TITLE[workflow.liveStepId]}
                  </span>
                  {' · '}
                  read-only history
                </p>
              ) : viewingStep?.workflowName ? (
                <p className="text-muted-foreground mt-1 text-xs">{viewingStep.workflowName}</p>
              ) : null}
            </div>
            {!isLiveStep ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 text-xs"
                onClick={() => {
                  setViewingStepId(workflow.liveStepId);
                  followLiveStepRef.current = true;
                }}
              >
                Back to live step
              </Button>
            ) : null}
          </div>
        </div>
        <div className="space-y-4 p-4">
          <StepContent
            stepId={viewingStepId}
            ctx={ctx}
            property={property}
            attachments={attachments}
            contractors={contractors}
            onCaseUpdated={onCaseUpdated}
            apiConnected={apiConnected}
          />
          <JobCaseStageEmailHistory
            emails={stageEmails}
            title={
              viewingStepId === MAINTENANCE_AGENT_STEP.JOB_COMPLETED
                ? 'All e-mail'
                : 'Email / message history'
            }
          />
          <MaintenanceStepAudit
            entries={ctx.workspaceCase.auditEntries}
            title="Audit"
            emptyLabel="No audit events yet. Workflow actions from job created through completion will appear here."
          />
        </div>
      </div>
    </div>
  );
}
