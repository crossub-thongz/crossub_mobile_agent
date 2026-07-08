import type { Inspection } from '@/lib/types';
import { formatScheduledAt } from '@/lib/utils';
import { inspectionCaseReferenceLabel } from '@/lib/workflow-case-reference';

export type PropertyInspectionWorkflowCategory = 'open' | 'ingoing' | 'outgoing' | 'routine';

export interface PropertyInspectionWorkflowCase {
  id: string;
  category: PropertyInspectionWorkflowCategory;
  label: string;
  status: string;
  currentStep: string;
  detail?: string;
  sortAt?: string;
  inspection: Inspection;
}

function parseSortTimestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function inspectionCategory(type: Inspection['type']): PropertyInspectionWorkflowCategory {
  switch (type) {
    case 'OPEN':
      return 'open';
    case 'INGOING':
      return 'ingoing';
    case 'OUTGOING':
      return 'outgoing';
    default:
      return 'routine';
  }
}

function inspectionRefKind(
  category: PropertyInspectionWorkflowCategory,
): 'open' | 'ingoing' | 'outgoing' | 'routine' {
  return category;
}

export function buildPropertyInspectionWorkflowCases(
  inspections: Inspection[],
): PropertyInspectionWorkflowCase[] {
  return [...inspections]
    .map((inspection) => {
      const category = inspectionCategory(inspection.type);
      const scheduledLabel = inspection.scheduledAt
        ? formatScheduledAt(inspection.scheduledAt)
        : null;
      return {
        id: inspection.id,
        category,
        label:
          inspection.trackingNumber ||
          inspectionCaseReferenceLabel(inspection.id, inspectionRefKind(category)),
        status: inspection.status,
        currentStep: inspection.status,
        detail: [
          scheduledLabel ? `Scheduled ${scheduledLabel}` : null,
          inspection.inspector ? `Inspector: ${inspection.inspector}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        sortAt: inspection.scheduledAt,
        inspection,
      };
    })
    .sort((a, b) => parseSortTimestamp(b.sortAt) - parseSortTimestamp(a.sortAt));
}

export const INSPECTION_CATEGORY_LABEL: Record<PropertyInspectionWorkflowCategory, string> = {
  open: 'Open',
  ingoing: 'Ingoing',
  outgoing: 'Outgoing',
  routine: 'Routine',
};

export const INSPECTION_WORKFLOW_CATEGORIES: PropertyInspectionWorkflowCategory[] = [
  'open',
  'ingoing',
  'outgoing',
  'routine',
];
