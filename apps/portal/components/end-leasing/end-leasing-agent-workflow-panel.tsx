'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { communicationsThread } from '@/constants/routes';

import {
  WorkflowProgressRail,
} from '@/components/agent/workflow-progress-rail';
import {
  TerminationPhasePanel,
} from '@/components/end-leasing/termination-phase-panels';
import { EndLeasingReportComparisonPanel } from '@/components/end-leasing/end-leasing-report-comparison-panel';
import {
  END_LEASING_AGENT_STEP,
  END_LEASING_AGENT_STEP_LABEL,
  END_LEASING_AGENT_STEP_ORDER,
  buildEndLeasingAgentWorkflow,
  type EndLeasingAgentStep,
} from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import {
  TERMINATION_STAGE,
  terminationStageOrderForCase,
} from '@/constants/end-leasing';
import { formatDateTime } from '@/lib/utils';

function mapAgentStepToTerminationStage(
  step: EndLeasingAgentStep,
  caseData: TerminationCaseDetail,
): (typeof TERMINATION_STAGE)[keyof typeof TERMINATION_STAGE] | null {
  switch (step) {
    case END_LEASING_AGENT_STEP.OVERVIEW:
      return TERMINATION_STAGE.TERMINATION_NOTICE;
    case END_LEASING_AGENT_STEP.VACATING_PREPARATION:
      return TERMINATION_STAGE.KEY_RETURN;
    case END_LEASING_AGENT_STEP.OUTGOING_ARRANGEMENT:
    case END_LEASING_AGENT_STEP.OUTGOING_INSPECTION:
      return TERMINATION_STAGE.OUTGOING_INSPECTION;
    case END_LEASING_AGENT_STEP.REPORT_COMPARISON:
      return TERMINATION_STAGE.MAINTENANCE;
    case END_LEASING_AGENT_STEP.SUMMARY_DISTRIBUTION:
    case END_LEASING_AGENT_STEP.BOND_SETTLEMENT:
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

function OverviewEmailPanel({
  email,
}: {
  email: NonNullable<ReturnType<typeof buildEndLeasingAgentWorkflow>['tenantNoticeEmail']>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">Tenant end-leasing email</p>
        </div>
        {email.commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Link href={communicationsThread(email.commConversationId)}>
              <ExternalLink className="size-3.5" />
              View in Message Center
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{email.from}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">To</dt>
            <dd className="font-medium">{email.to}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="font-medium">{email.subject}</dd>
          </div>
          {email.receivedAt ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Received</dt>
              <dd className="font-medium">{formatDateTime(email.receivedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
          Message
        </p>
        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{email.body}</pre>
      </div>
    </div>
  );
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
  const legacyStage = mapAgentStepToTerminationStage(viewingStepId, caseData);
  const stageOrder = terminationStageOrderForCase(caseData.terminationType);
  const showLegacyPanel =
    legacyStage != null &&
    stageOrder.includes(legacyStage) &&
    viewingStepId !== END_LEASING_AGENT_STEP.OVERVIEW &&
    viewingStepId !== END_LEASING_AGENT_STEP.REPORT_COMPARISON;

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
          <p className="mt-0.5 text-sm font-semibold">
            {END_LEASING_AGENT_STEP_LABEL[viewingStepId]}
          </p>
        </div>
        <div className="space-y-4 p-4">
          {viewingStepId === END_LEASING_AGENT_STEP.OVERVIEW && workflow.tenantNoticeEmail ? (
            <OverviewEmailPanel email={workflow.tenantNoticeEmail} />
          ) : viewingStepId === END_LEASING_AGENT_STEP.REPORT_COMPARISON ? (
            <>
              <SubProgressList items={viewingStep?.subProgress ?? []} />
              <EndLeasingReportComparisonPanel caseData={caseData} />
            </>
          ) : (
            <SubProgressList items={viewingStep?.subProgress ?? []} />
          )}

          {showLegacyPanel && legacyStage ? (
            <div className="border-t pt-4">
              <TerminationPhasePanel caseData={caseData} stage={legacyStage} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
