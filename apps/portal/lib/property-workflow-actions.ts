import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

export type PropertyWorkflowTab =
  | 'leasing'
  | 'maintenance'
  | 'inspection'
  | 'tribunal';

export type PropertyWorkflowActionId =
  | 'start_leasing'
  | 'start_rent_review'
  | 'start_end_leasing'
  | 'start_maintenance'
  | 'schedule_inspection'
  | 'open_tribunal';

export interface PropertyWorkflowAction {
  id: PropertyWorkflowActionId;
  label: string;
  description?: string;
  primary?: boolean;
}

export interface PropertyWorkflowContext {
  propertyId: string;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  currentLease?: LeasingRecord;
}

function isActiveWorkflowStatus(status: string | undefined): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase();
  return !(
    normalized.includes('completed') ||
    normalized.includes('closed') ||
    normalized.includes('cancelled') ||
    normalized.includes('signed')
  );
}

function hasActiveLeasingCycle(ctx: PropertyWorkflowContext): boolean {
  return ctx.leasingCycles.some(
    (c) => c.propertyId === ctx.propertyId,
  );
}

function hasRentReview(ctx: PropertyWorkflowContext): boolean {
  return ctx.rentReviews.some((r) => r.propertyId === ctx.propertyId);
}

function hasActiveEndLeasing(ctx: PropertyWorkflowContext): boolean {
  return ctx.vacatingCases.some(
    (v) => v.propertyId === ctx.propertyId && isActiveWorkflowStatus(v.apiStatus),
  );
}

function hasTribunalCase(ctx: PropertyWorkflowContext): boolean {
  return ctx.tribunalCases.some((t) => t.propertyId === ctx.propertyId);
}

/** Mirror crossub_web Property 360° `tabActionsFor` for the agent property hub. */
export function tabActionsFor(
  tab: PropertyWorkflowTab,
  ctx: PropertyWorkflowContext,
): PropertyWorkflowAction[] {
  switch (tab) {
    case 'leasing': {
      const actions: PropertyWorkflowAction[] = [];
      if (!hasActiveLeasingCycle(ctx)) {
        actions.push({
          id: 'start_leasing',
          label: 'Start new leasing',
          description: 'Open a leasing cycle for this property',
          primary: true,
        });
      }
      if (!hasRentReview(ctx)) {
        actions.push({
          id: 'start_rent_review',
          label: 'Add rent review',
          description: 'Open a rent review for this property',
        });
      }
      if (!hasActiveEndLeasing(ctx)) {
        actions.push({
          id: 'start_end_leasing',
          label: 'Add end leasing',
          description: 'Open a vacating or termination case',
        });
      }
      return actions;
    }
    case 'maintenance':
      return [
        {
          id: 'start_maintenance',
          label: 'Log maintenance job',
          description: 'Create a maintenance request for this property',
          primary: true,
        },
      ];
    case 'inspection':
      return [
        {
          id: 'schedule_inspection',
          label: 'Schedule inspection',
          description: 'Book an ingoing (move-in) inspection',
          primary: true,
        },
      ];
    case 'tribunal':
      if (hasTribunalCase(ctx)) return [];
      return [
        {
          id: 'open_tribunal',
          label: 'Open tribunal case',
          description: 'NCAT / tribunal workflow',
          primary: true,
        },
      ];
    default:
      return [];
  }
}

export function buildPropertyWorkflowContext(input: {
  propertyId: string;
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  currentLease?: LeasingRecord;
}): PropertyWorkflowContext {
  return {
    propertyId: input.propertyId,
    leasingCycles: input.leasingCycles.filter((c) => c.propertyId === input.propertyId),
    rentReviews: input.rentReviews.filter((r) => r.propertyId === input.propertyId),
    vacatingCases: input.vacatingCases.filter((v) => v.propertyId === input.propertyId),
    maintenance: input.maintenance.filter(
      (m) => m.propertyId === input.propertyId,
    ),
    inspections: input.inspections.filter((i) => i.propertyId === input.propertyId),
    tribunalCases: input.tribunalCases.filter((t) => t.propertyId === input.propertyId),
    currentLease: input.currentLease,
  };
}
