import type { VacatingLifecycleStep, VacatingChecklistStatus } from '@/lib/vacating/constants';
import type { LeasingItemStatus } from '@/lib/leasing/constants';
import type { TimelineEntry } from '@/lib/types';

export interface VacatingOutgoingInspection {
  status: LeasingItemStatus;
  inspectionId?: string;
  scheduledAt?: string;
  inspector?: string;
  reportStatus?: string;
  summary?: string;
}

export interface VacatingBondLine {
  label: string;
  amount: number;
}

export interface VacatingPropertyDetail {
  vacatingId: string;
  propertyId: string;
  propertyAddress: string;
  vacateDate: string;
  reason: string;
  bondStatus: string;
  requiresBondApproval: boolean;
  checklistProgress: number;
  activeStepHint: VacatingLifecycleStep;
  stepStatus: Record<VacatingLifecycleStep, VacatingChecklistStatus>;
  outgoingInspection: VacatingOutgoingInspection;
  bondBreakdown: VacatingBondLine[];
  timeline: TimelineEntry[];
}
