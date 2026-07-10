import {
  LANDLORD_DOCUMENT_SLOTS,
  TENANCY_DOCUMENT_SLOTS,
  TENANT_APPLICATION_DOCUMENT_SLOTS,
} from '@/lib/property-document-slots';

export type CreatePropertyDocumentGroup =
  | 'tenant_application'
  | 'landlord'
  | 'tenancy';

/** All groups (wizard Documents step). */
export const CREATE_PROPERTY_DOCUMENT_GROUP_ORDER: CreatePropertyDocumentGroup[] = [
  'tenancy',
  'landlord',
  'tenant_application',
];

/** Property detail Documents tab — all three document groups. */
export const PROPERTY_DETAIL_DOCUMENT_GROUP_ORDER: CreatePropertyDocumentGroup[] = [
  'tenancy',
  'landlord',
  'tenant_application',
];

export const CREATE_PROPERTY_DOCUMENT_GROUP_LABELS: Record<CreatePropertyDocumentGroup, string> = {
  tenancy: 'Tenancy Documents',
  landlord: 'Landlord Documents',
  tenant_application: 'Tenant Application Documents',
};

export type ExpectedDocumentSlot = {
  id: string;
  label: string;
  group: CreatePropertyDocumentGroup;
};

/** All document types shown on the property Documents tab and create-property wizard. */
export const EXPECTED_PROPERTY_DOCUMENT_SLOTS: ExpectedDocumentSlot[] = [
  ...TENANCY_DOCUMENT_SLOTS.map((s) => ({ ...s, group: 'tenancy' as const })),
  ...LANDLORD_DOCUMENT_SLOTS.map((s) => ({ ...s, group: 'landlord' as const })),
  ...TENANT_APPLICATION_DOCUMENT_SLOTS.map((s) => ({
    ...s,
    group: 'tenant_application' as const,
  })),
];

/** Fixed checklist slots for a Documents tab / wizard group. */
export function documentSlotsForGroup(
  group: CreatePropertyDocumentGroup,
): { id: string; label: string }[] {
  return EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === group).map(
    ({ id, label }) => ({ id, label }),
  );
}

const TENANT_APPLICATION_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'tenant_application').map((s) =>
    normalizeTitle(s.label),
  ),
);

const LANDLORD_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'landlord').map((s) =>
    normalizeTitle(s.label),
  ),
);

const TENANCY_LABELS = new Set(
  EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === 'tenancy').map((s) =>
    normalizeTitle(s.label),
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

  if (/^lease\s*(agreement|extension)/.test(key) || /lease\s*extension\s*agreement/.test(key)) {
    return 'tenancy';
  }
  if (TENANCY_LABELS.has(key)) return 'tenancy';
  if (TENANT_APPLICATION_LABELS.has(key)) return 'tenant_application';
  if (LANDLORD_LABELS.has(key)) return 'landlord';

  if (
    /photo\s*id|passport|visa|payslip|bank\s*statement|application\s*form|application\s*documents?/.test(
      key,
    )
  ) {
    return 'tenant_application';
  }
  if (/management\s*agreement|property\s*management\s*agreement/.test(key)) {
    return 'landlord';
  }
  if (
    /certificate\s*of\s*insurance|landlord\s*insurance|council\s*rate|strata|water\s*bill|water\s*efficiency|smoke\s*alarm/.test(
      key,
    )
  ) {
    return 'landlord';
  }
  if (/paper\s*bond|bond\s*lodgement|key\s*handover|ingoing/.test(key)) {
    return 'tenancy';
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

export type DocumentChecklistFile = {
  id: string;
  fileName: string;
  uploadedAt: string;
  href?: string | null;
  /** Agent-uploaded portal rows (`portal:<uuid>`) can be deleted from the Documents tab. */
  deletable?: boolean;
};

export type DocumentChecklistRow = {
  id: string;
  title: string;
  slotId?: string;
  uploaded: boolean;
  uploadedAt?: string;
  href?: string | null;
  files: DocumentChecklistFile[];
  isExtra?: boolean;
};

export function findPropertyDocument(
  documents: UploadedDocumentLike[],
  slotLabel: string,
): UploadedDocumentLike | undefined {
  return documents
    .filter((doc) => titlesMatch(slotLabel, doc.title))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
}

function titlesMatch(slotLabel: string, docTitle: string): boolean {
  const slot = normalizeTitle(slotLabel);
  const doc = normalizeTitle(docTitle);
  if (!slot || !doc) return false;
  if (doc === slot) return true;
  if (doc.endsWith(`— ${slot}`) || doc.endsWith(`- ${slot}`)) return true;
  if (doc.startsWith(`${slot} —`) || doc.startsWith(`${slot} -`)) return true;
  if (doc.startsWith(`${slot} (`)) return true;

  if (slot === 'lease agreement' && /lease\s*agreement/.test(doc) && !/extension/.test(doc)) {
    return true;
  }
  if (slot === 'lease extension agreement' && /lease\s*extension/.test(doc)) return true;
  if (
    slot === 'property management agreement' &&
    /property\s*management\s*agreement|management\s*agreement/.test(doc)
  ) {
    return true;
  }
  if (slot === 'landlord insurance' && /landlord\s*insurance/.test(doc)) return true;
  if (slot === 'paper bond' && (/paper\s*bond|bond\s*lodgement/.test(doc))) return true;
  if (slot === 'key handover form' && /key\s*handover/.test(doc)) return true;
  if (slot === 'ingoing inspection report' && /ingoing/.test(doc)) return true;
  if (slot === 'tenancy ledger' && /tenancy\s*ledger|rent\s*ledger/.test(doc)) return true;

  return false;
}

function fileNameFromDoc(
  doc: UploadedDocumentLike,
  slotLabel: string,
  index: number,
  total: number,
): string {
  const title = doc.title.trim();
  for (const sep of [' — ', ' - ']) {
    if (title.includes(sep)) {
      const [prefix, suffix] = title.split(sep);
      const normalizedPrefix = normalizeTitle(prefix ?? '');
      const normalizedSlot = normalizeTitle(slotLabel);
      if (
        suffix?.trim() &&
        (normalizedPrefix === normalizedSlot ||
          titlesMatch(slotLabel, prefix ?? '') ||
          normalizeTitle(suffix) !== normalizedSlot)
      ) {
        return suffix.trim();
      }
    }
  }
  if (total <= 1) return title || 'Document';
  return `File ${index + 1}`;
}

function toChecklistFiles(
  docs: UploadedDocumentLike[],
  slotLabel: string,
): DocumentChecklistFile[] {
  return docs.map((doc, index) => ({
    id: doc.id,
    fileName: fileNameFromDoc(doc, slotLabel, index, docs.length),
    uploadedAt: doc.uploadedAt,
    href: doc.href,
    deletable: doc.id.startsWith('portal:'),
  }));
}

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
      for (const m of matches) matchedIds.add(m.id);
      const files = toChecklistFiles(matches, slot.label);
      const latest = files[0];

      result[group].push({
        id: `slot:${slot.id}`,
        title: slot.label,
        slotId: slot.id,
        uploaded: files.length > 0,
        uploadedAt: latest?.uploadedAt,
        href: latest?.href,
        files,
      });
    }
  }

  const extrasByKey = new Map<
    string,
    { group: CreatePropertyDocumentGroup; title: string; docs: UploadedDocumentLike[] }
  >();
  for (const doc of documents) {
    if (matchedIds.has(doc.id)) continue;
    const group = classifyCreatePropertyDocument(doc.title);
    const key = `${group}::${normalizeTitle(doc.title)}`;
    const existing = extrasByKey.get(key);
    if (existing) {
      existing.docs.push(doc);
    } else {
      extrasByKey.set(key, { group, title: doc.title, docs: [doc] });
    }
  }

  for (const extra of extrasByKey.values()) {
    const docs = [...extra.docs].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    const files = toChecklistFiles(docs, extra.title);
    const latest = files[0];
    result[extra.group].push({
      id: `extra:${extra.group}:${normalizeTitle(extra.title)}`,
      title: extra.title,
      uploaded: true,
      uploadedAt: latest?.uploadedAt,
      href: latest?.href,
      files,
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
