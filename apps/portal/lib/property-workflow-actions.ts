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
  | 'rent_review'
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
  disabled?: boolean;
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

function hasActiveRentReview(ctx: PropertyWorkflowContext): boolean {
  return ctx.rentReviews.some(
    (r) =>
      r.propertyId === ctx.propertyId &&
      r.workflowState !== 'COMPLETED' &&
      r.workflowState !== 'CANCELLED' &&
      r.workflowState !== 'POSTPONED' &&
      !r.status.toLowerCase().includes('completed') &&
      !r.status.toLowerCase().includes('cancelled'),
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
    case 'leasing':
      return [
        {
          id: 'start_leasing',
          label: 'Add New Leasing',
          description: 'Open another new leasing cycle for this property',
          primary: true,
        },
        {
          id: 'start_end_leasing',
          label: 'End Leasing',
          description: 'Open another end leasing / vacating case for this property',
        },
      ];
    case 'rent_review': {
      const activeReview = hasActiveRentReview(ctx);
      return [
        {
          id: 'start_rent_review',
          label: 'Add rent review',
          description: activeReview
            ? 'Complete the current rent review before starting another'
            : 'Open a rent review for this property',
          primary: true,
          disabled: activeReview,
        },
      ];
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
    rentReviews: input.rentReviews.filter(
      (r) => !r.propertyId || r.propertyId === input.propertyId,
    ),
    vacatingCases: input.vacatingCases.filter((v) => v.propertyId === input.propertyId),
    maintenance: input.maintenance.filter(
      (m) => m.propertyId === input.propertyId,
    ),
    inspections: input.inspections.filter((i) => i.propertyId === input.propertyId),
    tribunalCases: input.tribunalCases.filter((t) => t.propertyId === input.propertyId),
    currentLease: input.currentLease,
  };
}
