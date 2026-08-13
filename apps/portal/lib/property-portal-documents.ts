import type { PropertyPortalDocument } from '@/lib/property-registry-api';
import type { Inspection } from '@/lib/types';
import { markSystemGeneratedReportName } from '@/lib/property-document-merge';

export const PORTAL_DOCUMENT_GROUP_LABELS: Record<string, string> = {
  management_agreement: 'Property documents',
  strata: 'Property documents',
  insurance: 'Property documents',
  lease: 'Leasing documents',
  application: 'Leasing documents',
  inspection_report: 'Inspection documents',
  quotation: 'Maintenance documents',
  invoice: 'Maintenance documents',
  statement: 'Accounting documents',
  tribunal: 'Tribunal documents',
};

export const PORTAL_DOCUMENT_GROUP_ORDER = [
  'Property documents',
  'Leasing documents',
  'Maintenance documents',
  'Accounting documents',
  'Tribunal documents',
  'Other',
] as const;

const INSPECTION_REPORT_TYPE_SUFFIX = {
  ingoing: 'IG',
  routine: 'RI',
  outgoing: 'OI',
  open: 'OP',
} as const;

function inspectionCategoryFromDocumentTitle(
  title: string,
): keyof typeof INSPECTION_REPORT_TYPE_SUFFIX | null {
  const upper = title.trim().toUpperCase();
  if (upper.startsWith('OI-') || upper.includes('OUTGOING')) return 'outgoing';
  if (upper.startsWith('RI-') || upper.includes('ROUTINE')) return 'routine';
  if (upper.startsWith('OP-') || /\bOPEN\b/.test(upper)) return 'open';
  if (upper.startsWith('IG-') || upper.includes('INGOING')) return 'ingoing';
  // Do not default unknowns to ingoing — that mixes open/marketing reports into
  // the current tenancy's ingoing checklist after a changeover.
  return null;
}

function findInspectionCategory(
  inspections: Inspection[],
  inspectionId?: string,
): keyof typeof INSPECTION_REPORT_TYPE_SUFFIX | null {
  if (!inspectionId) return null;
  const match = inspections.find((row) => row.id === inspectionId);
  if (!match) return null;
  switch (match.type) {
    case 'OUTGOING':
      return 'outgoing';
    case 'ROUTINE':
      return 'routine';
    case 'OPEN':
      return 'open';
    default:
      return 'ingoing';
  }
}

export function propertyJobDisplayName(property: {
  address: string;
  suburb?: string;
}): string {
  const locality = property.suburb?.trim();
  return locality ? `${property.address}, ${locality}` : property.address;
}

export function formatInspectionReportDisplayName(
  jobName: string,
  category: keyof typeof INSPECTION_REPORT_TYPE_SUFFIX,
): string {
  return markSystemGeneratedReportName(`${INSPECTION_REPORT_TYPE_SUFFIX[category]}-${jobName}`);
}

export function inspectionReportDisplayName(
  property: { address: string; suburb?: string },
  inspections: Inspection[],
  doc: PropertyPortalDocument,
): string {
  const category =
    findInspectionCategory(inspections, doc.inspectionId) ??
    inspectionCategoryFromDocumentTitle(doc.title) ??
    'open';
  return formatInspectionReportDisplayName(propertyJobDisplayName(property), category);
}

export function inspectionReportDownloadType(
  inspections: Inspection[],
  doc: PropertyPortalDocument,
): 'ingoing' | 'outgoing' | 'routine' | 'open' {
  const category =
    findInspectionCategory(inspections, doc.inspectionId) ??
    inspectionCategoryFromDocumentTitle(doc.title);
  if (category === 'outgoing') return 'outgoing';
  if (category === 'routine') return 'routine';
  if (category === 'ingoing') return 'ingoing';
  return 'open';
}

export function reportIdLabel(doc: { id: string; inspectionId?: string }): string {
  if (doc.inspectionId) return doc.inspectionId;
  for (const prefix of ['inspection-report:', 'portal:', 'inspection:']) {
    if (doc.id.startsWith(prefix)) return doc.id.slice(prefix.length);
  }
  return doc.id;
}

export function groupPortalDocuments(documents: PropertyPortalDocument[]) {
  const grouped: Record<string, PropertyPortalDocument[]> = {};
  for (const doc of documents) {
    const group = PORTAL_DOCUMENT_GROUP_LABELS[doc.category] ?? 'Other';
    grouped[group] = grouped[group] ?? [];
    grouped[group].push(doc);
  }
  for (const group of Object.keys(grouped)) {
    grouped[group].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }
  return grouped;
}
