import type { AgentDocument } from '@/lib/types';

export type PropertyDocumentGroup = 'reports' | 'documents';

export const DOCUMENT_GROUP_LABELS: Record<PropertyDocumentGroup, string> = {
  reports: 'Reports',
  documents: 'Documents',
};

export const DOCUMENT_CATEGORY_LABELS: Record<AgentDocument['category'], string> = {
  inspection: 'Inspection reports',
  rent_review: 'Rent review',
  maintenance: 'Maintenance',
  lease: 'Lease agreements',
  vacating: 'Vacating',
};

const REPORT_CATEGORIES = new Set<AgentDocument['category']>([
  'inspection',
  'rent_review',
  'maintenance',
]);

export const DOCUMENT_GROUP_ORDER: PropertyDocumentGroup[] = ['reports', 'documents'];

export const CATEGORY_ORDER: AgentDocument['category'][] = [
  'inspection',
  'rent_review',
  'maintenance',
  'lease',
  'vacating',
];

export function documentGroup(category: AgentDocument['category']): PropertyDocumentGroup {
  return REPORT_CATEGORIES.has(category) ? 'reports' : 'documents';
}

export type GroupedPropertyDocuments = Record<
  PropertyDocumentGroup,
  Partial<Record<AgentDocument['category'], AgentDocument[]>>
>;

/** Group property documents into Reports vs Documents, then by category. */
export function groupPropertyDocuments(docs: AgentDocument[]): GroupedPropertyDocuments {
  const grouped: GroupedPropertyDocuments = { reports: {}, documents: {} };
  for (const doc of docs) {
    const group = documentGroup(doc.category);
    const bucket = grouped[group][doc.category] ?? [];
    bucket.push(doc);
    grouped[group][doc.category] = bucket;
  }
  for (const group of DOCUMENT_GROUP_ORDER) {
    for (const category of CATEGORY_ORDER) {
      grouped[group][category]?.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
    }
  }
  return grouped;
}

export function countGroupedDocuments(grouped: GroupedPropertyDocuments): number {
  return DOCUMENT_GROUP_ORDER.reduce((total, group) => {
    return (
      total +
      CATEGORY_ORDER.reduce(
        (sum, category) => sum + (grouped[group][category]?.length ?? 0),
        0,
      )
    );
  }, 0);
}
