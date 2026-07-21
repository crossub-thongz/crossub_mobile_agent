'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { WorkflowProgressRail } from '@/components/agent/workflow-progress-rail';
import { WorkflowMobileStepChips } from '@/components/agent/workflow-mobile-step-chips';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { EndLeasingBondReleasedPanel } from '@/components/end-leasing/end-leasing-bond-released-panel';
import { EndLeasingOutgoingInspectionPanel } from '@/components/end-leasing/end-leasing-outgoing-inspection-panel';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import { EndLeasingResultConfirmedPanel } from '@/components/end-leasing/end-leasing-result-confirmed-panel';
import { EndLeasingVacateConfirmedPanel } from '@/components/end-leasing/end-leasing-vacate-confirmed-panel';
import {
  END_LEASING_AGENT_STEP,
  END_LEASING_AGENT_STEP_LABEL,
  END_LEASING_AGENT_STEP_ORDER,
  buildEndLeasingAgentWorkflow,
  endLeasingEmailRecordsForStep,
  type EndLeasingAgentStep,
} from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

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
      return <EndLeasingOutgoingInspectionPanel caseData={caseData} />;
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

  const isLiveStep = viewingStepId === workflow.liveStepId;
  const stageEmails = useMemo(
    () => endLeasingEmailRecordsForStep(caseData, viewingStepId),
    [caseData, viewingStepId],
  );

  const stepTitles: Record<EndLeasingAgentStep, string> = {
    [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: 'Vacate',
    [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: 'Outgoing inspection',
    [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: 'Compare ingoing / outgoing',
    [END_LEASING_AGENT_STEP.GET_QUOTE]: 'Repair quotes',
    [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: 'Confirm tenant responsibility',
    [END_LEASING_AGENT_STEP.BOND_RELEASED]: 'Bond settlement',
  };

  const showEmailHistory =
    viewingStepId === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION ||
    viewingStepId === END_LEASING_AGENT_STEP.REPORT_COMPARISON ||
    viewingStepId === END_LEASING_AGENT_STEP.GET_QUOTE ||
    viewingStepId === END_LEASING_AGENT_STEP.RESULT_CONFIRMED ||
    viewingStepId === END_LEASING_AGENT_STEP.BOND_RELEASED;

  const isStepEnabled = (stepId: EndLeasingAgentStep) => {
    const step = workflow.steps.find((s) => s.id === stepId);
    return step != null && step.status !== 'upcoming';
  };

  return (
    <div className="space-y-4">
      <WorkflowMobileStepChips
        steps={END_LEASING_AGENT_STEP_ORDER}
        labels={END_LEASING_AGENT_STEP_LABEL}
        currentStep={viewingStepId}
        onStepClick={handleStepClick}
        isStepCompleted={(stepId) =>
          workflow.steps.find((s) => s.id === stepId)?.status === 'done'
        }
        isStepEnabled={isStepEnabled}
      />

      <div className="hidden md:block">
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
          isStepEnabled={isStepEnabled}
          onStepClick={handleStepClick}
        />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-3 py-3 md:px-4">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {isLiveStep ? 'Current step' : 'Step detail'}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{stepTitles[viewingStepId]}</p>
        </div>
        <div className="space-y-4 p-3 md:p-4">
          <StepContent stepId={viewingStepId} caseData={caseData} />

          {showEmailHistory ? (
            <JobCaseStageEmailHistory
              emails={stageEmails}
              title="Emails & Messages History"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
