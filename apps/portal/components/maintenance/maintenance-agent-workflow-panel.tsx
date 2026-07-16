'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { WorkflowProgressRail } from '@/components/agent/workflow-progress-rail';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { MaintenanceGetQuotePanel } from '@/components/maintenance/maintenance-get-quote-panel';
import { MaintenanceInProgressPanel } from '@/components/maintenance/maintenance-in-progress-panel';
import { MaintenanceJobCompletedPanel } from '@/components/maintenance/maintenance-job-completed-panel';
import { MaintenanceJobCreatedPanel } from '@/components/maintenance/maintenance-job-created-panel';
import { MaintenanceReviewPanel } from '@/components/maintenance/maintenance-review-panel';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import type { Property } from '@/lib/types';
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

function SubProgressList({ items }: { items: { id: string; label: string; done: boolean }[] }) {
  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Progress
        </p>
        <p className="text-muted-foreground text-[10px] tabular-nums">
          {doneCount}/{items.length}
        </p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border px-2.5 py-2 text-xs ${
              item.done
                ? 'border-primary/20 bg-primary/5 text-foreground'
                : 'border-border/60 bg-muted/20 text-muted-foreground'
            }`}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
          onCaseUpdated={onCaseUpdated}
        />
      );
    default:
      return null;
  }
}

export function MaintenanceAgentWorkflowPanel({
  ctx,
  property,
  attachments = [],
  contractors = [],
  onCaseUpdated,
  apiConnected = true,
}: {
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  attachments?: ApiMaintenanceAttachment[];
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
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
          <p className="mt-0.5 text-sm font-semibold">{MAINTENANCE_AGENT_STEP_TITLE[viewingStepId]}</p>
          {isLiveStep && viewingStep?.workflowName ? (
            <p className="text-muted-foreground mt-1 text-xs">{viewingStep.workflowName}</p>
          ) : null}
        </div>
        <div className="space-y-4 p-4">
          <SubProgressList items={viewingStep?.subProgress ?? []} />
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
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
