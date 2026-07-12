import type { InspectionCreateResult } from '@/components/inspections/create-inspection-wizard';

export type PropertyWorkflowCreatedCase =
  | { kind: 'leasing'; id: string }
  | { kind: 'rent_review'; id: string }
  | { kind: 'end_leasing'; id: string }
  | { kind: 'maintenance'; id: string };

export type PropertyWorkflowCreatedResult =
  | PropertyWorkflowCreatedCase
  | InspectionCreateResult;

export function isWorkflowCreatedCase(
  result: PropertyWorkflowCreatedResult,
): result is PropertyWorkflowCreatedCase {
  return 'kind' in result;
}
