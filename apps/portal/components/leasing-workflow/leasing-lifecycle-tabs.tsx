'use client';

import { useCallback, useMemo, useState } from 'react';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { LeasingLifecyclePhaseNav } from '@/components/leasing-workflow/leasing-lifecycle-phase-nav';
import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { LeasingStepApplicationApproval } from '@/components/leasing-workflow/leasing-step-application-approval';
import { LeasingStepOnboarding } from '@/components/leasing-workflow/leasing-step-onboarding';
import { LeasingStepOpenInspection } from '@/components/leasing-workflow/leasing-step-open-inspection';
import { LeasingStepOpenReport } from '@/components/leasing-workflow/leasing-step-open-report';
import { LeasingStepResults } from '@/components/leasing-workflow/leasing-step-results';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { LEASING_LIFECYCLE_STEP, LEASING_AGENT_SELF_OPEN_LABEL, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import {
  enrichLeasingEmailRecords,
} from '@/lib/leasing/agent-workflow-email';
import {
  leasingStageEmailsWithOpenSupplement,
} from '@/lib/open-inspection/linked-case-history';
import {
  resolveLeasingWorkflowContentStep,
} from '@/lib/leasing/letting-rail-progress';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { resolveRentReviewAgentEmail } from '@/lib/rent-review/agent-email';
import { useOpenInspectionEmailSources } from '@/hooks/use-open-inspection-email-sources';
import { useLivePoll } from '@/lib/use-live-poll';

export function LeasingLifecycleTabs({
  detail,
  leasingCycleId,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  detail: LeasingPropertyDetail;
  leasingCycleId?: string;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const activeStep = useLeasingWorkflowStore((s) => s.getActiveStep(detail.propertyId));
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const liveDetail = useLeasingWorkflowStore((s) => s.getDetail(detail.propertyId)) ?? detail;
  const [now, setNow] = useState(() => new Date());
  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow);

  const contentStep = useMemo(
    () => resolveLeasingWorkflowContentStep(activeStep, liveDetail, now),
    [activeStep, liveDetail, now],
  );

  const showLettingRail =
    contentStep === LEASING_LIFECYCLE_STEP.OPEN_INSPECTION ||
    contentStep === LEASING_LIFECYCLE_STEP.OPEN_REPORT ||
    contentStep === LEASING_LIFECYCLE_STEP.RESULTS;

  return (
    <div className="min-w-0 space-y-4">
      <div className={showLettingRail ? undefined : 'hidden md:block'}>
        <LeasingLifecycleStepRail
          detail={liveDetail}
          currentStep={activeStep}
          onStepClick={(step) => setActiveStep(detail.propertyId, step)}
        />
      </div>

      {liveDetail.openInspection.agentConducted ? (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3">
          <p className="text-sm font-semibold">{LEASING_AGENT_SELF_OPEN_LABEL}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            You are conducting the open inspection for this property. CROSSUB will not create a
            separate open inspection order.
          </p>
        </div>
      ) : null}

      <LeasingLifecyclePhaseNav
        detail={liveDetail}
        activeStep={activeStep}
        onStepClick={(step) => setActiveStep(detail.propertyId, step)}
      />

      <StepPanel
        step={contentStep}
        detail={liveDetail}
        leasingCycleId={leasingCycleId}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
    </div>
  );
}

function StepPanel({
  step,
  detail,
  leasingCycleId,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  step: LeasingLifecycleStep;
  detail: LeasingPropertyDetail;
  leasingCycleId?: string;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const { properties, agencies, apiConnected } = useAgentData();
  const { user } = useAuth();
  const property = properties.find((p) => p.id === detail.propertyId);
  const agency = agencies.find((a) => a.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail ?? detail.agentInfo.email,
  });
  const { openSession, poolInspectionRecord } = useOpenInspectionEmailSources({
    enabled: !detail.openInspection.agentConducted,
    apiConnected,
    leasingDetail: detail,
    poll: true,
  });
  const stageEmails = useMemo(
    () =>
      enrichLeasingEmailRecords(
        leasingStageEmailsWithOpenSupplement({
          detail,
          step,
          openSession,
          poolInspectionRecord,
        }),
        agentEmail,
        detail.agentInfo.name,
      ),
    [agentEmail, detail, openSession, poolInspectionRecord, step],
  );

  return (
    <div className="space-y-4">
      <StepPanelContent
        step={step}
        detail={detail}
        leasingCycleId={leasingCycleId}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
      {/* Onboarding embeds its own history; RESULTS shows mail under each applicant. */}
      {step !== LEASING_LIFECYCLE_STEP.RESULTS &&
      step !== LEASING_LIFECYCLE_STEP.ONBOARDING ? (
        <JobCaseStageEmailHistory emails={stageEmails} />
      ) : null}
    </div>
  );
}

function StepPanelContent({
  step,
  detail,
  leasingCycleId,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  step: LeasingLifecycleStep;
  detail: LeasingPropertyDetail;
  leasingCycleId?: string;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      return (
        <LeasingStepOpenInspection
          detail={detail}
          leasingCycleId={leasingCycleId}
          onOpenInspectionCreated={onOpenInspectionCreated}
        />
      );
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return <LeasingStepOpenReport detail={detail} />;
    case LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL:
      return <LeasingStepApplicationApproval detail={detail} />;
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return <LeasingStepResults detail={detail} onCaseClosed={onCaseClosed} />;
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return <LeasingStepOnboarding detail={detail} />;
    default:
      return null;
  }
}
