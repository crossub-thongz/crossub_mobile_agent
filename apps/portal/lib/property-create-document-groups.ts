import {
  LEASING_FIXED_DOC_SLOTS,
  OTHER_LEASING_DOCUMENT_OPTIONS,
  PROPERTY_FIXED_DOC_SLOTS,
} from '@/components/agent/property-leasing-details-section';
import { MANAGEMENT_DOC_SLOTS } from '@/components/agent/property-management-details-section';

export type CreatePropertyDocumentGroup =
  | 'tenant_application'
  | 'landlord'
  | 'tenancy';

export const CREATE_PROPERTY_DOCUMENT_GROUP_ORDER: CreatePropertyDocumentGroup[] = [
  'tenancy',
  'landlord',
  'tenant_application',
];

export const CREATE_PROPERTY_DOCUMENT_GROUP_LABELS: Record<CreatePropertyDocumentGroup, string> = {
  tenancy: 'Tenancy Documents',
  landlord: 'Landlord Documents',
  tenant_application: 'Tenant Application Documents',
};

const TENANT_APPLICATION_SLOT_IDS = new Set([
  'application_form',
  'photo_id',
  'bank_statement',
  'tenancy_ledger',
  'visa',
  'payslip',
]);

const TENANCY_LEASE_SLOT_IDS = new Set(['lease_agreement', 'lease_extension']);

const TENANCY_OTHER_SLOT_IDS = new Set([
  'bond_lodgement',
  'ingoing_report',
  'rent_ledger',
]);

export type ExpectedDocumentSlot = {
  id: string;
  label: string;
  group: CreatePropertyDocumentGroup;
};

/** All document types shown on the property Documents tab (create-property checklist). */
export const EXPECTED_PROPERTY_DOCUMENT_SLOTS: ExpectedDocumentSlot[] = [
  ...LEASING_FIXED_DOC_SLOTS.filter((s) => TENANCY_LEASE_SLOT_IDS.has(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    group: 'tenancy' as const,
  })),
  // Property docs — skip landlord insurance here; it lives under Landlord Documents.
  ...PROPERTY_FIXED_DOC_SLOTS.filter((s) => s.id !== 'property_landlord_insurance').map((s) => ({
    id: s.id,
    label: s.label,
    group: 'tenancy' as const,
  })),
  ...OTHER_LEASING_DOCUMENT_OPTIONS.filter((s) => TENANCY_OTHER_SLOT_IDS.has(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    group: 'tenancy' as const,
  })),
  ...MANAGEMENT_DOC_SLOTS.map((s) => ({
    id: s.id,
    label: s.label,
    group: 'landlord' as const,
  })),
  ...LEASING_FIXED_DOC_SLOTS.filter((s) => TENANT_APPLICATION_SLOT_IDS.has(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    group: 'tenant_application' as const,
  })),
];

const TENANT_APPLICATION_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'tenant_application').map((s) =>
    s.label.toLowerCase(),
  ),
);

const LANDLORD_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'landlord').map((s) =>
    s.label.toLowerCase(),
  ),
);

const TENANCY_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'tenancy').map((s) =>
    s.label.toLowerCase(),
  ),
);

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Classify a create-property / portal document into one of the three Documents tables. */
export function classifyCreatePropertyDocument(title: string): CreatePropertyDocumentGroup {
  const key = normalizeTitle(title);
  if (!key) return 'tenancy';

  if (key.startsWith('landlord —') || key.startsWith('landlord -')) return 'landlord';
  if (
    key.startsWith('tenant application —') ||
    key.startsWith('tenant application -')
  ) {
    return 'tenant_application';
  }

  // Prefer landlord for "Landlord insurance" (shared label with property docs).
  if (LANDLORD_LABELS.has(key) && key === 'landlord insurance') return 'landlord';
  if (TENANCY_LABELS.has(key)) return 'tenancy';
  if (TENANT_APPLICATION_LABELS.has(key)) return 'tenant_application';
  if (LANDLORD_LABELS.has(key)) return 'landlord';

  // Fuzzy fallbacks for custom "Add document" titles / older uploads.
  if (
    /photo\s*id|passport|visa|payslip|bank\s*statement|application\s*form|application\s*documents?|tenancy\s*ledger/.test(
      key,
    )
  ) {
    return 'tenant_application';
  }
  if (/management\s*agreement|certificate\s*of\s*insurance|property\s*management|landlord\s*insurance/.test(key)) {
    return 'landlord';
  }
  return 'tenancy';
}

/**
 * When uploading from the Documents tab, keep known slot titles as-is; otherwise
 * prefix so the file lands in the group the agent selected.
 */
export function ensureGroupDocumentTitle(
  group: CreatePropertyDocumentGroup,
  title: string,
): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;
  if (classifyCreatePropertyDocument(trimmed) === group) return trimmed;
  if (group === 'landlord') return `Landlord — ${trimmed}`;
  if (group === 'tenant_application') return `Tenant application — ${trimmed}`;
  return trimmed;
}

export type UploadedDocumentLike = {
  id: string;
  title: string;
  uploadedAt: string;
  href?: string | null;
};

export type DocumentChecklistRow = {
  /** Stable row key (slot id or uploaded doc id). */
  id: string;
  /** Display name / document type. */
  title: string;
  /** Slot id when this is an expected checklist type. */
  slotId?: string;
  uploaded: boolean;
  uploadedAt?: string;
  href?: string | null;
  /** Extra uploads beyond the expected checklist. */
  isExtra?: boolean;
};

function titlesMatch(slotLabel: string, docTitle: string): boolean {
  const slot = normalizeTitle(slotLabel);
  const doc = normalizeTitle(docTitle);
  if (!slot || !doc) return false;
  if (doc === slot) return true;
  // Prefixed custom titles: "Landlord — Certificate of insurance"
  if (doc.endsWith(`— ${slot}`) || doc.endsWith(`- ${slot}`)) return true;
  return false;
}

/**
 * Build checklist rows for each group: every expected document type, plus any
 * extra uploads that don't match a known type. Shows uploaded-at when present.
 */
export function buildDocumentChecklistByGroup(
  documents: UploadedDocumentLike[],
): Record<CreatePropertyDocumentGroup, DocumentChecklistRow[]> {
  const matchedIds = new Set<string>();
  const result: Record<CreatePropertyDocumentGroup, DocumentChecklistRow[]> = {
    tenancy: [],
    landlord: [],
    tenant_application: [],
  };

  for (const group of CREATE_PROPERTY_DOCUMENT_GROUP_ORDER) {
    const slots = EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === group);
    for (const slot of slots) {
      const matches = documents
        .filter((d) => titlesMatch(slot.label, d.title))
        .sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        );
      const latest = matches[0];
      for (const m of matches) matchedIds.add(m.id);

      if (latest) {
        result[group].push({
          id: `${slot.id}:${latest.id}`,
          title: slot.label,
          slotId: slot.id,
          uploaded: true,
          uploadedAt: latest.uploadedAt,
          href: latest.href,
        });
        // Additional files of the same type
        for (const extra of matches.slice(1)) {
          result[group].push({
            id: `${slot.id}:${extra.id}`,
            title: `${slot.label} (${extra.title})`,
            slotId: slot.id,
            uploaded: true,
            uploadedAt: extra.uploadedAt,
            href: extra.href,
            isExtra: true,
          });
        }
      } else {
        result[group].push({
          id: `slot:${slot.id}`,
          title: slot.label,
          slotId: slot.id,
          uploaded: false,
        });
      }
    }
  }

  // Unmatched / custom uploads still appear under their classified group.
  for (const doc of documents) {
    if (matchedIds.has(doc.id)) continue;
    const group = classifyCreatePropertyDocument(doc.title);
    result[group].push({
      id: doc.id,
      title: doc.title,
      uploaded: true,
      uploadedAt: doc.uploadedAt,
      href: doc.href,
      isExtra: true,
    });
  }

  return result;
}

export function groupCreatePropertyDocuments<T extends { title: string; uploadedAt?: string }>(
  documents: T[],
): Record<CreatePropertyDocumentGroup, T[]> {
  const grouped: Record<CreatePropertyDocumentGroup, T[]> = {
    tenancy: [],
    landlord: [],
    tenant_application: [],
  };
  for (const doc of documents) {
    grouped[classifyCreatePropertyDocument(doc.title)].push(doc);
  }
  for (const key of CREATE_PROPERTY_DOCUMENT_GROUP_ORDER) {
    grouped[key].sort((a, b) => {
      const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.title.localeCompare(b.title);
    });
  }
  return grouped;
}
