import type {
  Inspection,
  MaintenanceRequest,
  MessageThread,
  Property,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import {
  inspectionDetail,
  maintenanceDetail,
  messageDetail,
  propertyDetail,
  rentReviewDetail,
  ROUTES,
  tenantSelectionDetail,
  tribunalDetail,
  vacatingDetail,
} from '@/constants/routes';

export type SystemSearchResult = {
  id: string;
  kind: string;
  label: string;
  sub: string;
  href: string;
  propertyId?: string;
  phone?: string;
  email?: string;
  contactName?: string;
};

type SearchData = {
  properties: Property[];
  maintenanceAll: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  vacating: VacatingCase[];
  tenantSelections: TenantSelectionCase[];
  tribunalCases: TribunalCase[];
  messages: MessageThread[];
  needActionItems: PropertyNeedAction[];
};

export function searchAgentSystem(query: string, data: SearchData): SystemSearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const out: SystemSearchResult[] = [];

  for (const p of data.properties) {
    if (
      p.address.toLowerCase().includes(q) ||
      p.tenantName.toLowerCase().includes(q) ||
      p.suburb.toLowerCase().includes(q) ||
      p.homeOwnerName.toLowerCase().includes(q)
    ) {
      out.push({
        id: `prop-${p.id}`,
        kind: 'Property',
        label: `${p.address}, ${p.suburb}`,
        sub: p.tenantName,
        href: propertyDetail(p.id),
        propertyId: p.id,
        phone: p.tenantContact.phone ?? p.homeOwnerContact.phone,
        email: p.tenantContact.email ?? p.homeOwnerContact.email,
        contactName: p.tenantName,
      });
    }
  }

  for (const m of data.maintenanceAll) {
    if (
      m.title.toLowerCase().includes(q) ||
      m.trackingNumber.toLowerCase().includes(q) ||
      m.propertyAddress.toLowerCase().includes(q) ||
      (m.contractorName?.toLowerCase().includes(q) ?? false)
    ) {
      out.push({
        id: `maint-${m.id}`,
        kind: 'Maintenance',
        label: m.title,
        sub: m.trackingNumber,
        href: maintenanceDetail(m.id),
        propertyId: m.propertyId,
      });
    }
  }

  for (const i of data.inspections) {
    if (
      i.trackingNumber.toLowerCase().includes(q) ||
      i.propertyAddress.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q)
    ) {
      out.push({
        id: `insp-${i.id}`,
        kind: 'Inspection',
        label: i.trackingNumber,
        sub: `${i.type} · ${i.status}`,
        href: inspectionDetail(i.id),
        propertyId: i.propertyId,
      });
    }
  }

  for (const r of data.rentReviews) {
    if (r.propertyAddress.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)) {
      out.push({
        id: `rr-${r.id}`,
        kind: 'Rent review',
        label: r.propertyAddress,
        sub: r.status,
        href: rentReviewDetail(r.id),
        propertyId: r.propertyId,
      });
    }
  }

  for (const v of data.vacating) {
    if (v.propertyAddress.toLowerCase().includes(q)) {
      out.push({
        id: `vac-${v.id}`,
        kind: 'Vacating',
        label: v.propertyAddress,
        sub: v.status,
        href: vacatingDetail(v.id),
        propertyId: v.propertyId,
      });
    }
  }

  for (const t of data.tenantSelections) {
    if (t.propertyAddress.toLowerCase().includes(q) || t.applicantName.toLowerCase().includes(q)) {
      out.push({
        id: `ts-${t.id}`,
        kind: 'Tenant selection',
        label: t.applicantName,
        sub: t.propertyAddress,
        href: tenantSelectionDetail(t.id),
        propertyId: t.propertyId,
      });
    }
  }

  for (const t of data.tribunalCases) {
    if (
      t.propertyAddress.toLowerCase().includes(q) ||
      t.matter.toLowerCase().includes(q) ||
      t.tenantName.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    ) {
      out.push({
        id: `tri-${t.id}`,
        kind: 'Tribunal',
        label: t.matter,
        sub: t.propertyAddress,
        href: tribunalDetail(t.id),
        propertyId: t.propertyId,
      });
    }
  }

  for (const msg of data.messages) {
    if (
      msg.subject.toLowerCase().includes(q) ||
      msg.propertyAddress.toLowerCase().includes(q) ||
      msg.tenantName.toLowerCase().includes(q)
    ) {
      out.push({
        id: `msg-${msg.id}`,
        kind: 'Message',
        label: msg.subject,
        sub: msg.propertyAddress,
        href: messageDetail(msg.id),
        propertyId: msg.propertyId,
      });
    }
  }

  if (q.includes('need action') || q.includes('tasks')) {
    out.push({
      id: 'nav-tasks',
      kind: 'Navigation',
      label: 'Need action queue',
      sub: `${data.needActionItems.length} items`,
      href: ROUTES.TASKS,
    });
  }

  return out.slice(0, 12);
}

export function buildAgentAiReply(query: string, results: SystemSearchResult[]): string {
  const trimmed = query.trim();
  if (!trimmed) {
    return 'Ask me to find a property, maintenance job, inspection, tribunal case, or message thread.';
  }
  if (results.length === 0) {
    return `I couldn't find anything matching "${trimmed}" across your portfolio. Try an address, tracking number, or tenant name.`;
  }
  const kinds = [...new Set(results.map((r) => r.kind))];
  const top = results.slice(0, 3);
  const list = top.map((r) => `• ${r.kind}: ${r.label}`).join('\n');
  return `Found ${results.length} result${results.length === 1 ? '' : 's'} in ${kinds.join(', ')}.\n\n${list}${results.length > 3 ? '\n\nTap a result below to open, message, or call.' : '\n\nTap a result to open, message, or call.'}`;
}
