import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  tribunalDetail,
} from '@/constants/routes';
import type {
  AgentDocument,
  Inspection,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TribunalCase,
} from '@/lib/types';

export interface RentPaymentRecord {
  id: string;
  at: string;
  amount: number;
  status: 'paid' | 'late' | 'missed';
  reference?: string;
}

export interface LeaseDocumentItem {
  id: string;
  label: string;
  href?: string;
  downloadUrl?: string;
  status: 'available' | 'pending';
  category: 'lease' | 'bond' | 'deposit' | 'inspection' | 'other';
}

export interface LeaseHistoryItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  date?: string;
  messageCategory: import('@/lib/types').MessageCategory;
}

export interface LeasePackageData {
  documents: LeaseDocumentItem[];
  rentPayments: RentPaymentRecord[];
  tribunal: LeaseHistoryItem[];
  rentReviews: LeaseHistoryItem[];
  maintenance: LeaseHistoryItem[];
  inspections: LeaseHistoryItem[];
}

function parseTime(iso: string): number {
  return new Date(iso).getTime();
}

export function isWithinLeasePeriod(date: string, lease: LeasingRecord): boolean {
  const t = parseTime(date);
  return t >= parseTime(lease.leaseStart) && t <= parseTime(lease.leaseEnd);
}

function overlapsLease(lease: LeasingRecord, start: string, end: string): boolean {
  const ls = parseTime(lease.leaseStart);
  const le = parseTime(lease.leaseEnd);
  const s = parseTime(start);
  const e = parseTime(end);
  return s <= le && e >= ls;
}

function itemDateFromMaintenance(m: MaintenanceRequest): string | undefined {
  return m.timeline[0]?.at;
}

function buildRentPayments(
  lease: LeasingRecord,
  accounting?: PropertyAccounting,
): RentPaymentRecord[] {
  const payments: RentPaymentRecord[] = [];

  if (accounting) {
    for (const c of accounting.collectionActivity) {
      if (!isWithinLeasePeriod(c.at, lease)) continue;
      if (c.type === 'email' || c.type === 'sms') continue;
      payments.push({
        id: `rent-${c.id}`,
        at: c.at,
        amount: lease.rentWeekly,
        status: c.summary.toLowerCase().includes('arrears') ? 'late' : 'paid',
        reference: c.summary,
      });
    }
  }

  const start = new Date(lease.leaseStart);
  const end = new Date(Math.min(parseTime(lease.leaseEnd), Date.now()));
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  let i = 0;

  while (cursor <= end && payments.length < 8) {
    const at = cursor.toISOString();
    if (isWithinLeasePeriod(at, lease)) {
      const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      if (!payments.some((p) => p.id === `rent-m-${monthKey}`)) {
        payments.push({
          id: `rent-m-${monthKey}`,
          at,
          amount: lease.rentWeekly * 4,
          status: 'paid',
          reference: `Monthly rent — ${cursor.toLocaleString('en-AU', { month: 'short', year: 'numeric' })}`,
        });
      }
    }
    cursor.setMonth(cursor.getMonth() + 1);
    i += 1;
    if (i > 36) break;
  }

  return payments.sort((a, b) => parseTime(b.at) - parseTime(a.at));
}

function buildDocuments(
  lease: LeasingRecord,
  property: Property,
  documents: AgentDocument[],
  inspections: Inspection[],
): LeaseDocumentItem[] {
  const addr = property.address.split(',')[0];
  const propertyDocs = documents.filter((d) => d.propertyAddress.includes(addr));

  const findDoc = (keywords: string[]) =>
    propertyDocs.find((d) =>
      keywords.some((k) => d.title.toLowerCase().includes(k.toLowerCase())),
    );

  const ingoing = inspections.find(
    (i) =>
      i.id === lease.ingoingInspectionId ||
      (i.type === 'INGOING' && i.propertyId === lease.propertyId),
  );
  const outgoing = inspections.find(
    (i) => i.type === 'OUTGOING' && i.propertyId === lease.propertyId,
  );

  const leaseDoc = findDoc(['lease agreement', 'lease']);
  const bondDoc = findDoc(['bond']);
  const depositDoc = findDoc(['deposit']);

  const items: LeaseDocumentItem[] = [
    {
      id: 'doc-lease',
      label: 'Lease agreement',
      href: leaseDoc?.href,
      downloadUrl: leaseDoc?.downloadUrl ?? leaseDoc?.href,
      status: leaseDoc ? 'available' : 'pending',
      category: 'lease',
    },
    {
      id: 'doc-bond',
      label: 'Bond receipt',
      href: bondDoc?.href,
      downloadUrl: bondDoc?.downloadUrl ?? bondDoc?.href,
      status: lease.bondAmount != null || bondDoc ? 'available' : 'pending',
      category: 'bond',
    },
    {
      id: 'doc-deposit',
      label: 'Deposit receipt',
      href: depositDoc?.href,
      downloadUrl: depositDoc?.downloadUrl ?? depositDoc?.href,
      status: lease.depositAmount != null || depositDoc ? 'available' : 'pending',
      category: 'deposit',
    },
    {
      id: 'doc-ingoing',
      label: 'Ingoing inspection report',
      href: ingoing ? inspectionDetail(ingoing.id) : undefined,
      downloadUrl: ingoing?.reportUrl,
      status: ingoing ? 'available' : 'pending',
      category: 'inspection',
    },
    {
      id: 'doc-outgoing',
      label: 'Outgoing inspection report',
      href: outgoing ? inspectionDetail(outgoing.id) : undefined,
      downloadUrl: outgoing?.reportUrl,
      status: outgoing ? 'available' : 'pending',
      category: 'inspection',
    },
  ];

  for (const i of inspections.filter((x) => x.propertyId === lease.propertyId)) {
    if (i.type === 'ROUTINE' && i.scheduledAt && isWithinLeasePeriod(i.scheduledAt, lease)) {
      items.push({
        id: `doc-routine-${i.id}`,
        label: `Routine inspection — ${i.scheduledAt.slice(0, 7)}`,
        href: inspectionDetail(i.id),
        downloadUrl: i.reportUrl,
        status: 'available',
        category: 'inspection',
      });
    }
  }

  return items;
}

export function buildLeasePackageData(
  lease: LeasingRecord,
  property: Property,
  input: {
    maintenance: MaintenanceRequest[];
    inspections: Inspection[];
    rentReviews: RentReviewCase[];
    tribunalCases: TribunalCase[];
    documents: AgentDocument[];
    accounting?: PropertyAccounting;
  },
): LeasePackageData {
  const maintenance = input.maintenance
    .filter((m) => m.propertyId === lease.propertyId)
    .filter((m) => {
      const d = itemDateFromMaintenance(m);
      return d ? isWithinLeasePeriod(d, lease) : lease.status === 'current';
    })
    .map((m) => ({
      id: m.id,
      label: m.title,
      sublabel: m.status,
      href: maintenanceDetail(m.id),
      date: itemDateFromMaintenance(m),
      messageCategory: 'Maintenance' as const,
    }));

  const inspections = input.inspections
    .filter((i) => i.propertyId === lease.propertyId)
    .filter((i) => !i.scheduledAt || isWithinLeasePeriod(i.scheduledAt, lease))
    .map((i) => ({
      id: i.id,
      label: `${i.type} inspection`,
      sublabel: i.status,
      href: inspectionDetail(i.id),
      date: i.scheduledAt,
      messageCategory: 'Inspection' as const,
    }));

  const rentReviews = input.rentReviews
    .filter((r) => r.propertyId === lease.propertyId)
    .filter((r) => overlapsLease(lease, r.leaseStart, r.leaseEnd))
    .map((r) => ({
      id: r.id,
      label: `Rent review — ${r.status}`,
      sublabel: `${r.currentRent} → ${r.suggestedRent} proposed`,
      href: rentReviewDetail(r.id),
      date: r.reviewDue,
      messageCategory: 'Leasing' as const,
    }));

  const tribunal = input.tribunalCases
    .filter((t) => t.propertyId === lease.propertyId)
    .filter(
      (t) =>
        !t.hearingDate ||
        isWithinLeasePeriod(t.hearingDate, lease) ||
        t.tenantName === lease.approvedTenant,
    )
    .map((t) => ({
      id: t.id,
      label: t.matter,
      sublabel: t.status,
      href: tribunalDetail(t.id),
      date: t.hearingDate,
      messageCategory: 'Tribunal' as const,
    }));

  return {
    documents: buildDocuments(lease, property, input.documents, input.inspections),
    rentPayments: buildRentPayments(lease, input.accounting),
    tribunal,
    rentReviews,
    maintenance,
    inspections,
  };
}
