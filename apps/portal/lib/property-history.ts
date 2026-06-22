import type {
  AgentDocument,
  Inspection,
  LeasingRecord,
  MaintenanceRequest,
  MessageThread,
  RentReviewCase,
  TenantSelectionCase,
} from '@/lib/types';

export type PropertyHistoryKind =
  | 'leasing'
  | 'maintenance'
  | 'inspection'
  | 'rent_review'
  | 'message'
  | 'document'
  | 'tenancy';

export interface PropertyHistoryEntry {
  id: string;
  kind: PropertyHistoryKind;
  title: string;
  subtitle?: string;
  at: string;
  href: string;
}

const KIND_LABEL: Record<PropertyHistoryKind, string> = {
  leasing: 'Leasing',
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  rent_review: 'Rent review',
  message: 'Message',
  document: 'Document',
  tenancy: 'Tenancy',
};

export function propertyHistoryKindLabel(kind: PropertyHistoryKind): string {
  return KIND_LABEL[kind];
}

export function buildPropertyHistory(input: {
  propertyId: string;
  leasing: LeasingRecord[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
  messages: MessageThread[];
  documents: AgentDocument[];
  propertyAddressPrefix: string;
  leasePackageHref: (leaseId: string) => string;
  maintenanceHref: (id: string) => string;
  inspectionHref: (id: string) => string;
  rentReviewHref: (id: string) => string;
  tenantSelectionHref: (id: string) => string;
  messageHref: (id: string) => string;
}): PropertyHistoryEntry[] {
  const entries: PropertyHistoryEntry[] = [];

  for (const l of input.leasing) {
    entries.push({
      id: `lease-${l.id}`,
      kind: 'tenancy',
      title: `${l.approvedTenant} · ${l.status} tenancy`,
      subtitle: `${l.leaseStart} — ${l.leaseEnd}`,
      at: l.leaseEnd,
      href: input.leasePackageHref(l.id),
    });
  }

  for (const t of input.tenantSelections) {
    entries.push({
      id: `ts-${t.id}`,
      kind: 'leasing',
      title: `Application · ${t.applicantName}`,
      subtitle: t.status,
      at: t.timeline[0]?.at ?? new Date().toISOString(),
      href: input.tenantSelectionHref(t.id),
    });
  }

  for (const m of input.maintenance) {
    entries.push({
      id: `maint-${m.id}`,
      kind: 'maintenance',
      title: m.title,
      subtitle: m.status,
      at: m.timeline[0]?.at ?? new Date().toISOString(),
      href: input.maintenanceHref(m.id),
    });
  }

  for (const i of input.inspections) {
    entries.push({
      id: `insp-${i.id}`,
      kind: 'inspection',
      title: `${i.type} inspection · ${i.trackingNumber}`,
      subtitle: i.status,
      at: i.scheduledAt ?? i.timeline[0]?.at ?? new Date().toISOString(),
      href: input.inspectionHref(i.id),
    });
  }

  for (const r of input.rentReviews) {
    entries.push({
      id: `rr-${r.id}`,
      kind: 'rent_review',
      title: 'Rent review',
      subtitle: r.status,
      at: r.reviewDue,
      href: input.rentReviewHref(r.id),
    });
  }

  for (const msg of input.messages) {
    entries.push({
      id: `msg-${msg.id}`,
      kind: 'message',
      title: msg.subject,
      subtitle: msg.taskType ?? msg.messageCategory,
      at: msg.lastAt,
      href: input.messageHref(msg.id),
    });
  }

  for (const d of input.documents) {
    if (!d.propertyAddress.includes(input.propertyAddressPrefix)) continue;
    entries.push({
      id: `doc-${d.id}`,
      kind: 'document',
      title: d.title,
      subtitle: d.category,
      at: d.uploadedAt,
      href: d.href,
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
