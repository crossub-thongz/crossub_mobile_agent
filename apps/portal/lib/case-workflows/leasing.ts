import { LEASING_LIFECYCLE_STEP, LEASING_ONBOARDING_STEP } from '@/constants/api-enums';
import { isCompletedLeasingCycle } from '@/lib/property-leasing-history';
import type { LeasingCycle } from '@/lib/types';

import { buildCaseWorkflowProgress } from './build-progress';
import type { CaseWorkflowProgress, CaseWorkflowStep } from './types';

const LEASING_LIFECYCLE_STEPS = [
  { id: LEASING_LIFECYCLE_STEP.OPEN_INSPECTION, label: 'Open inspection' },
  { id: LEASING_LIFECYCLE_STEP.OPEN_REPORT, label: 'Open report' },
  { id: LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL, label: 'Application approval' },
  { id: LEASING_LIFECYCLE_STEP.ONBOARDING, label: 'Tenant Onboarding' },
] as const;

const LEASING_ONBOARDING_STEPS = [
  { id: LEASING_ONBOARDING_STEP.DEPOSIT, label: 'Deposit paid' },
  { id: LEASING_ONBOARDING_STEP.BOND, label: 'Bond' },
  { id: LEASING_ONBOARDING_STEP.AGREEMENT, label: 'Agreement' },
  { id: LEASING_ONBOARDING_STEP.KEY_COLLECTION, label: 'Key collection' },
] as const;

function lifecycleStepToId(step: string): string {
  switch (step) {
    case 'OPEN_INSPECTION':
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    case 'OPEN_REPORT':
      return LEASING_LIFECYCLE_STEP.OPEN_REPORT;
    case 'APPLICATION_APPROVAL':
      return LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL;
    case 'ONBOARDING':
      return LEASING_LIFECYCLE_STEP.ONBOARDING;
    default:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
  }
}

const isLeasingCaseCompleted = isCompletedLeasingCycle;

function buildAllDoneProgress(
  title: string,
  stepDefs: readonly { id: string; label: string }[],
): CaseWorkflowProgress {
  const steps: CaseWorkflowStep[] = stepDefs.map((step) => ({
    id: step.id,
    label: step.label,
    status: 'done',
  }));
  const last = stepDefs[stepDefs.length - 1]!;
  return {
    title,
    steps,
    currentStepId: last.id,
    currentStepLabel: 'Completed',
  };
}

export function leasingLifecycleProgress(cycle: LeasingCycle): CaseWorkflowProgress {
  if (isLeasingCaseCompleted(cycle)) {
    return buildAllDoneProgress('New leasing workflow', LEASING_LIFECYCLE_STEPS);
  }
  return buildCaseWorkflowProgress(
    'New leasing workflow',
    LEASING_LIFECYCLE_STEPS,
    lifecycleStepToId(cycle.lifecycleStep),
  );
}

export function leasingOnboardingProgress(cycle: LeasingCycle): CaseWorkflowProgress | null {
  if (cycle.lifecycleStep !== 'ONBOARDING' || !cycle.onboardingStepId) return null;
  if (isLeasingCaseCompleted(cycle)) {
    return buildAllDoneProgress('Onboarding procedures', LEASING_ONBOARDING_STEPS);
  }
  return buildCaseWorkflowProgress(
    'Onboarding procedures',
    LEASING_ONBOARDING_STEPS,
    cycle.onboardingStepId,
  );
}
