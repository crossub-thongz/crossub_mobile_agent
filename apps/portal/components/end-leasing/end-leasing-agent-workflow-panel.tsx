'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  WorkflowProgressRail,
} from '@/components/agent/workflow-progress-rail';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { EndLeasingBondReleasedPanel } from '@/components/end-leasing/end-leasing-bond-released-panel';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import { EndLeasingResultConfirmedPanel } from '@/components/end-leasing/end-leasing-result-confirmed-panel';
import { EndLeasingVacateConfirmedPanel } from '@/components/end-leasing/end-leasing-vacate-confirmed-panel';
import {
  TerminationPhasePanel,
} from '@/components/end-leasing/termination-phase-panels';
import {
  END_LEASING_AGENT_STEP,
  END_LEASING_AGENT_STEP_LABEL,
  END_LEASING_AGENT_STEP_ORDER,
  buildEndLeasingAgentWorkflow,
  endLeasingEmailRecordsForStep,
  type EndLeasingAgentStep,
} from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import {
  TERMINATION_STAGE,
  terminationStageOrderForCase,
} from '@/constants/end-leasing';

function mapAgentStepToTerminationStage(
  step: EndLeasingAgentStep,
): (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE] | null {
  switch (step) {
    case END_LEASING_AGENT_STEP.VACATE_CONFIRMED:
      return TERMINATION_STAGE.KEY_RETURN;
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return TERMINATION_STAGE.OUTGOING_INSPECTION;
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
    case END_LEASING_AGENT_STEP.GET_QUOTE:
      return TERMINATION_STAGE.MAINTENANCE;
    case END_LEASING_AGENT_STEP.RESULT_CONFIRMED:
    case END_LEASING_AGENT_STEP.BOND_RELEASED:
      return TERMINATION_STAGE.BOND;
    default:
      return null;
  }
}

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
  caseData,
}: {
  stepId: EndLeasingAgentStep;
  caseData: TerminationCaseDetail;
}) {
  switch (stepId) {
    case END_LEASING_AGENT_STEP.VACATE_CONFIRMED:
      return <EndLeasingVacateConfirmedPanel caseData={caseData} />;
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return null;
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      return <EndLeasingReportComparisonPanel caseData={caseData} mode="compare" />;
    case END_LEASING_AGENT_STEP.GET_QUOTE:
      return <EndLeasingReportComparisonPanel caseData={caseData} mode="quote" />;
    case END_LEASING_AGENT_STEP.RESULT_CONFIRMED:
      return <EndLeasingResultConfirmedPanel caseData={caseData} />;
    case END_LEASING_AGENT_STEP.BOND_RELEASED:
      return <EndLeasingBondReleasedPanel caseData={caseData} />;
    default:
      return null;
  }
}

export function EndLeasingAgentWorkflowPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const workflow = useMemo(() => buildEndLeasingAgentWorkflow(caseData), [caseData]);
  const [viewingStepId, setViewingStepId] = useState<EndLeasingAgentStep>(workflow.liveStepId);
  const initializedRef = useRef<string | null>(null);
  const followLiveStepRef = useRef(true);

  useEffect(() => {
    if (initializedRef.current !== caseData.id) {
      setViewingStepId(workflow.liveStepId);
      initializedRef.current = caseData.id;
      followLiveStepRef.current = true;
      return;
    }

    if (followLiveStepRef.current) {
      setViewingStepId(workflow.liveStepId);
    }
  }, [caseData.id, workflow.liveStepId]);

  const handleStepClick = (stepId: EndLeasingAgentStep) => {
    setViewingStepId(stepId);
    followLiveStepRef.current = stepId === workflow.liveStepId;
  };

  const viewingStep = workflow.steps.find((s) => s.id === viewingStepId) ?? workflow.steps[0];
  const isLiveStep = viewingStepId === workflow.liveStepId;
  const stageEmails = useMemo(
    () => endLeasingEmailRecordsForStep(caseData, viewingStepId),
    [caseData, viewingStepId],
  );
  const legacyStage = mapAgentStepToTerminationStage(viewingStepId);
  const stageOrder = terminationStageOrderForCase(caseData.terminationType);
  const showLegacyPanel =
    legacyStage != null &&
    stageOrder.includes(legacyStage) &&
    viewingStepId === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION;

  const stepTitles: Record<EndLeasingAgentStep, string> = {
    [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: 'Vacate date confirmed',
    [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: 'Outgoing inspection',
    [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: 'Compare in / outgoing',
    [END_LEASING_AGENT_STEP.GET_QUOTE]: 'Get quote',
    [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: 'Result confirmed',
    [END_LEASING_AGENT_STEP.BOND_RELEASED]: 'Bond released',
  };

  return (
    <div className="space-y-4">
      <WorkflowProgressRail
        steps={END_LEASING_AGENT_STEP_ORDER}
        labels={END_LEASING_AGENT_STEP_LABEL}
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
          <p className="mt-0.5 text-sm font-semibold">{stepTitles[viewingStepId]}</p>
          {viewingStepId !== END_LEASING_AGENT_STEP.VACATE_CONFIRMED &&
          isLiveStep &&
          viewingStep?.workflowName ? (
            <p className="text-muted-foreground mt-1 text-xs">{viewingStep.workflowName}</p>
          ) : null}
        </div>
        <div className="space-y-4 p-4">
          <SubProgressList items={viewingStep?.subProgress ?? []} />
          <StepContent stepId={viewingStepId} caseData={caseData} />

          {showLegacyPanel && legacyStage ? (
            <div className="border-t pt-4">
              <TerminationPhasePanel caseData={caseData} stage={legacyStage} />
            </div>
          ) : null}

          <JobCaseStageEmailHistory
            emails={stageEmails}
            title={
              viewingStepId === END_LEASING_AGENT_STEP.BOND_RELEASED
                ? 'All e-mail'
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
