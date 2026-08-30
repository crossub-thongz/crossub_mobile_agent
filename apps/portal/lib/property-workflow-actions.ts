import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  RentReviewCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { isRentReviewDecided } from '@/lib/rent-review';

export type PropertyWorkflowTab =
  | 'leasing'
  | 'rent_review'
  | 'maintenance'
  | 'inspection'
  | 'accounting'
  | 'tribunal';

export const PROPERTY_WORKFLOW_ACTION_GROUPS: { title: string; tab: PropertyWorkflowTab }[] = [
  { title: 'Leasing', tab: 'leasing' },
  { title: 'Rent review', tab: 'rent_review' },
  { title: 'Maintenance', tab: 'maintenance' },
  { title: 'Inspection', tab: 'inspection' },
  { title: 'Financial', tab: 'accounting' },
  { title: 'Tribunal', tab: 'tribunal' },
];

export type PropertyWorkflowActionId =
  | 'start_leasing'
  | 'start_rent_review'
  | 'start_end_leasing'
  | 'start_maintenance'
  | 'schedule_open_inspection'
  | 'schedule_ingoing_inspection'
  | 'schedule_outgoing_inspection'
  | 'schedule_routine_inspection'
  | 'create_rent_reconciliation'
  | 'open_invoice_management'
  | 'open_rent_chasing'
  | 'open_tribunal';

export type InspectionScheduleActionId =
  | 'schedule_open_inspection'
  | 'schedule_ingoing_inspection'
  | 'schedule_outgoing_inspection'
  | 'schedule_routine_inspection';

export type InspectionScheduleType = 'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE';

const INSPECTION_SCHEDULE_ACTION_TYPES: Record<
  InspectionScheduleActionId,
  InspectionScheduleType
> = {
  schedule_open_inspection: 'OPEN',
  schedule_ingoing_inspection: 'INGOING',
  schedule_outgoing_inspection: 'OUTGOING',
  schedule_routine_inspection: 'ROUTINE',
};

export function isInspectionScheduleAction(
  actionId: PropertyWorkflowActionId | null,
): actionId is InspectionScheduleActionId {
  return (
    actionId === 'schedule_open_inspection' ||
    actionId === 'schedule_ingoing_inspection' ||
    actionId === 'schedule_outgoing_inspection' ||
    actionId === 'schedule_routine_inspection'
  );
}

export function inspectionTypeForScheduleAction(
  actionId: InspectionScheduleActionId,
): InspectionScheduleType {
  return INSPECTION_SCHEDULE_ACTION_TYPES[actionId];
}

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
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  tribunalCases: TribunalCase[];
  currentLease?: LeasingRecord;
}

function hasActiveRentReview(ctx: PropertyWorkflowContext): boolean {
  return ctx.rentReviews.some(
    (r) => r.propertyId === ctx.propertyId && !isRentReviewDecided(r),
  );
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
          label: 'Add New Leasing/Open',
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
          label: 'Add new repair job',
          description: 'Create a repair request for this property',
          primary: true,
        },
      ];
    case 'inspection':
      return [
        {
          id: 'schedule_open_inspection',
          label: 'Open',
          description: 'Schedule an open inspection for prospects',
          primary: true,
        },
        {
          id: 'schedule_ingoing_inspection',
          label: 'Ingoing',
          description: 'Move-in condition report before a new tenant',
        },
        {
          id: 'schedule_outgoing_inspection',
          label: 'Outgoing',
          description: 'End-of-lease condition report after vacating',
        },
        {
          id: 'schedule_routine_inspection',
          label: 'Routine',
          description: 'Scheduled self or in-person routine check',
        },
      ];
    case 'tribunal':
      if (ctx.tribunalCases.length > 0) return [];
      return [
        {
          id: 'open_tribunal',
          label: 'Add tribunal',
          description: 'Open an NCAT tribunal case from accounting arrears on this property',
          primary: true,
        },
      ];
    case 'accounting':
      return [
        {
          id: 'create_rent_reconciliation',
          label: 'Create rent reconciliation',
          description: 'Review rent received and outstanding balances for this property',
          primary: true,
        },
        {
          id: 'open_invoice_management',
          label: 'Invoice management',
          description: 'Create or manage Crossub management fee tax invoices',
        },
        {
          id: 'open_rent_chasing',
          label: 'Rent chasing',
          description: 'Add rent, bill, or bond arrears for this property',
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
  maintenance: MaintenanceRequest[];
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
