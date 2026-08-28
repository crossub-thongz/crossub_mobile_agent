import type { PropertyPortalDocument } from '@/lib/property-registry-api';
import {
  SYSTEM_GENERATED_REPORT_MARKER,
} from '@/lib/property-document-merge';
import {
  inspectionReportDisplayName,
} from '@/lib/property-portal-documents';
import type { AgentDocument, Inspection } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export type PropertyProfileDocumentCategory =
  | 'tenancy'
  | 'property'
  | 'owner'
  | 'reports'
  | 'invoices';

export type PropertyProfileDocumentCategoryFilter =
  | 'all'
  | PropertyProfileDocumentCategory;

export type PropertyProfileDocumentRow = {
  id: string;
  title: string;
  category: PropertyProfileDocumentCategory;
  categoryLabel: string;
  uploadedAt: string;
  uploadedAtSort: number;
  uploadedBy: string;
  fileTypeLabel: string;
  href?: string;
  deletable: boolean;
};

export const PROPERTY_PROFILE_DOCUMENT_CATEGORY_FILTERS: {
  id: PropertyProfileDocumentCategoryFilter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'tenancy', label: 'Tenancy' },
  { id: 'property', label: 'Property' },
  { id: 'owner', label: 'Owner' },
  { id: 'reports', label: 'Reports' },
  { id: 'invoices', label: 'Invoices' },
];

const CATEGORY_LABEL: Record<PropertyProfileDocumentCategory, string> = {
  tenancy: 'Tenancy',
  property: 'Property',
  owner: 'Owner',
  reports: 'Reports',
  invoices: 'Invoices',
};

type DocumentCategorySource =
  | PropertyPortalDocument['category']
  | AgentDocument['category']
  | 'tribunal'
  | 'quotation'
  | 'statement'
  | 'inspection_report'
  | 'strata'
  | 'insurance'
  | 'invoice';

export function resolvePropertyProfileDocumentCategory(
  category: DocumentCategorySource,
): PropertyProfileDocumentCategory {
  switch (category) {
    case 'lease':
    case 'application':
    case 'vacating':
    case 'tribunal':
      return 'tenancy';
    case 'management_agreement':
    case 'strata':
    case 'insurance':
    case 'maintenance':
      return 'property';
    case 'statement':
      return 'owner';
    case 'inspection_report':
    case 'inspection':
    case 'rent_review':
      return 'reports';
    case 'invoice':
    case 'quotation':
      return 'invoices';
    default:
      return 'tenancy';
  }
}

export function resolvePropertyProfileUploadedBy(input: {
  id: string;
  title: string;
  category: DocumentCategorySource;
}): string {
  if (input.category === 'inspection_report' || input.category === 'inspection') {
    return 'Inspector';
  }
  if (
    input.title.includes(SYSTEM_GENERATED_REPORT_MARKER) ||
    input.id.startsWith('inspection-report:') ||
    input.id.startsWith('inspection:') ||
    input.category === 'statement' ||
    input.category === 'invoice' ||
    input.category === 'rent_review'
  ) {
    return 'CROS System';
  }
  return 'Agent';
}

function fileTypeLabelFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (/\.(png|jpe?g|webp|gif)$/i.test(lower)) return 'Image';
  if (/\.(docx?|word)$/i.test(lower)) return 'DOC';
  return 'PDF';
}

function uploadedAtSort(uploadedAt: string): number {
  const parsed = Date.parse(uploadedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapPortalDocument(input: {
  doc: PropertyPortalDocument;
  property: { address: string; suburb?: string };
  propertyInspections: Inspection[];
}): PropertyProfileDocumentRow | null {
  const { doc, property, propertyInspections } = input;
  if (doc.previousTenantName?.trim()) return null;

  let title = doc.title;
  if (doc.category === 'inspection_report') {
    const displayName = inspectionReportDisplayName(property, propertyInspections, doc);
    if (/routine/i.test(doc.title) || /routine/i.test(displayName)) {
      title = `Routine inspection report – ${formatDate(doc.uploadedAt)}`;
    } else if (/ingoing|condition/i.test(doc.title) || /ingoing/i.test(displayName)) {
      title = `Condition report (Ingoing)`;
    } else {
      title = displayName;
    }
  }

  const category = resolvePropertyProfileDocumentCategory(doc.category);

  return {
    id: doc.id,
    title,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    uploadedAt: formatDate(doc.uploadedAt),
    uploadedAtSort: uploadedAtSort(doc.uploadedAt),
    uploadedBy: resolvePropertyProfileUploadedBy({
      id: doc.id,
      title,
      category: doc.category,
    }),
    fileTypeLabel: fileTypeLabelFromTitle(title),
    href: doc.url,
    deletable: doc.id.startsWith('portal:'),
  };
}

function mapFallbackDocument(doc: AgentDocument): PropertyProfileDocumentRow {
  const category = resolvePropertyProfileDocumentCategory(doc.category);
  return {
    id: doc.id,
    title: doc.title,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    uploadedAt: formatDate(doc.uploadedAt),
    uploadedAtSort: uploadedAtSort(doc.uploadedAt),
    uploadedBy: resolvePropertyProfileUploadedBy({
      id: doc.id,
      title: doc.title,
      category: doc.category,
    }),
    fileTypeLabel: fileTypeLabelFromTitle(doc.title),
    href: doc.downloadUrl ?? doc.href,
    deletable: doc.id.startsWith('portal:'),
  };
}

export function buildPropertyProfileDocuments(input: {
  portalDocuments: PropertyPortalDocument[];
  fallbackDocuments?: AgentDocument[];
  property: { address: string; suburb?: string };
  propertyInspections: Inspection[];
  apiConnected: boolean;
  portalLoaded: boolean;
}): PropertyProfileDocumentRow[] {
  const portalRows = input.portalDocuments
    .map((doc) =>
      mapPortalDocument({
        doc,
        property: input.property,
        propertyInspections: input.propertyInspections,
      }),
    )
    .filter((row): row is PropertyProfileDocumentRow => row != null);

  if (input.apiConnected && input.portalLoaded) {
    return dedupeDocumentRows(portalRows).sort((a, b) => b.uploadedAtSort - a.uploadedAtSort);
  }

  const fallbackRows = (input.fallbackDocuments ?? []).map(mapFallbackDocument);
  return dedupeDocumentRows([...portalRows, ...fallbackRows]).sort(
    (a, b) => b.uploadedAtSort - a.uploadedAtSort,
  );
}

function dedupeDocumentRows(rows: PropertyProfileDocumentRow[]): PropertyProfileDocumentRow[] {
  const seen = new Set<string>();
  const out: PropertyProfileDocumentRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function filterPropertyProfileDocuments(
  rows: PropertyProfileDocumentRow[],
  categoryFilter: PropertyProfileDocumentCategoryFilter,
): PropertyProfileDocumentRow[] {
  if (categoryFilter === 'all') return rows;
  return rows.filter((row) => row.category === categoryFilter);
}

export function countPropertyProfileDocumentsByCategory(
  rows: PropertyProfileDocumentRow[],
): Record<PropertyProfileDocumentCategory, number> {
  return rows.reduce(
    (counts, row) => {
      counts[row.category] += 1;
      return counts;
    },
    {
      tenancy: 0,
      property: 0,
      owner: 0,
      reports: 0,
      invoices: 0,
    },
  );
}

export type PropertyProfileDocumentUploadCategory = 'tenancy' | 'property' | 'owner';

export const PROPERTY_PROFILE_DOCUMENT_UPLOAD_CATEGORIES: {
  id: PropertyProfileDocumentUploadCategory;
  label: string;
  apiCategory: AgentDocument['category'];
}[] = [
  { id: 'tenancy', label: 'Tenancy', apiCategory: 'lease' },
  { id: 'property', label: 'Property', apiCategory: 'management_agreement' },
  { id: 'owner', label: 'Owner', apiCategory: 'management_agreement' },
];
