import type { AgentDocument, Inspection, LeasingRecord, Property, RentReviewCase } from '@/lib/types';
import type { PropertyBondSnapshot } from '@/lib/use-property-overview-sync';
import { inspectionDetail } from '@/constants/routes';

export interface PropertyReportLink {
  label: string;
  href?: string;
  status: string;
}

export interface PendingRentChange {
  newRent: number;
  startDate: string;
}

export function findIngoingInspection(
  inspections: Inspection[],
  propertyId: string,
  lease?: LeasingRecord,
): Inspection | undefined {
  if (lease?.ingoingInspectionId) {
    return inspections.find((i) => i.id === lease.ingoingInspectionId);
  }
  return inspections
    .filter((i) => i.propertyId === propertyId && i.type === 'INGOING')
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime())[0];
}

export function findRoutineInspection(
  inspections: Inspection[],
  propertyId: string,
): Inspection | undefined {
  return inspections
    .filter((i) => i.propertyId === propertyId && i.type === 'ROUTINE')
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime())[0];
}

function findDocByKeywords(docs: AgentDocument[], keywords: string[]) {
  return docs.find((d) =>
    keywords.some((k) => d.title.toLowerCase().includes(k.toLowerCase())),
  );
}

function viewableDocumentUrl(doc?: AgentDocument): string | undefined {
  const url = doc?.downloadUrl ?? doc?.href;
  return url && url !== '#' ? url : undefined;
}

function inspectionHasReport(inspection: Inspection): boolean {
  return (
    Boolean(inspection.reportUrl) ||
    inspection.reportStatus === 'sent' ||
    inspection.reportStatus === 'uploaded' ||
    inspection.reportStatus === 'approved'
  );
}

function resolveReportHref(
  inspection: Inspection | undefined,
  doc?: AgentDocument,
): string | undefined {
  if (inspection?.reportUrl) return inspection.reportUrl;
  const docUrl = viewableDocumentUrl(doc);
  if (docUrl) return docUrl;
  if (inspection && inspectionHasReport(inspection)) {
    return inspectionDetail(inspection.id);
  }
  return undefined;
}

export function resolveIngoingReportLink(
  inspection: Inspection | undefined,
  documents: AgentDocument[],
): PropertyReportLink {
  const doc = findDocByKeywords(documents, ['ingoing', 'entry condition']);
  const href = resolveReportHref(inspection, doc);
  const status = inspection?.reportStatus ?? (doc ? 'On file' : 'Not available');
  return { label: 'Ingoing report', href, status };
}

export function resolveRoutineReportLink(
  inspection: Inspection | undefined,
  documents: AgentDocument[],
): PropertyReportLink {
  const doc = findDocByKeywords(documents, ['routine']);
  const href = resolveReportHref(inspection, doc);
  const status = inspection?.reportStatus ?? (doc ? 'On file' : 'Not available');
  return { label: 'Routine inspection report', href, status };
}

export function formatCarSpaces(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(value);
}

export interface BondReference {
  label: string;
  /** In-app navigation to new leasing step 4 bond section. */
  showLodgementNav?: boolean;
}

/** Bond lodgement from leasing step 4 — label from cycle bond block. */
export function resolveBondReference(
  property: Property,
  bond?: PropertyBondSnapshot | null,
  documents: AgentDocument[] = [],
  lease?: LeasingRecord,
): BondReference {
  const link = bond?.agentLink?.trim();
  if (link) {
    const idMatch = link.match(/\b\d{6,}\b/);
    return {
      label: idMatch?.[0] ?? 'View bond lodgement',
      showLodgementNav: true,
    };
  }
  if (bond?.ledgerEntryId) {
    return { label: bond.ledgerEntryId, showLodgementNav: true };
  }
  if (property.bondId?.trim()) {
    return { label: property.bondId.trim() };
  }
  const bondDoc = findDocByKeywords(documents, ['bond', 'rbo', 'lodgement']);
  if (bondDoc) {
    const match = bondDoc.title.match(/\b\d{6,}\b/);
    if (match) return { label: match[0] };
    return { label: bondDoc.title };
  }
  const amount = bond?.amount ?? lease?.bondAmount ?? property.bondAmount;
  if (amount != null && amount > 0) {
    return {
      label: `Pending lodgement · $${Math.round(amount)}`,
      showLodgementNav: Boolean(bond),
    };
  }
  return { label: '—' };
}

/** @deprecated Use resolveBondReference for link support. */
export function resolveBondId(
  property: Property,
  documents: AgentDocument[],
  lease?: LeasingRecord,
): string {
  return resolveBondReference(property, null, documents, lease).label;
}

export function resolvePendingRentChange(
  property: Property,
  reviews: RentReviewCase[],
  decisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>,
  options: { isVacant: boolean; currentRent: number },
): PendingRentChange | null {
  if (options.isVacant) return null;

  const upcoming = [...reviews]
    .filter((r) => {
      const status = r.status.toLowerCase();
      return !status.includes('complete') && !status.includes('confirmed');
    })
    .sort((a, b) => new Date(a.reviewDue).getTime() - new Date(b.reviewDue).getTime());

  const review = upcoming[0];
  if (!review) return null;

  const decision = decisions[review.id];
  const newRent =
    decision?.action === 'custom' && decision.amount != null
      ? decision.amount
      : review.suggestedRent;

  if (!newRent || newRent <= 0 || newRent === options.currentRent) return null;

  return { newRent, startDate: review.reviewDue };
}

export function resolveCurrentRent(property: Property, lease?: LeasingRecord): number {
  if (lease?.rentWeekly && lease.rentWeekly > 0) return lease.rentWeekly;
  return property.rentWeekly ?? 0;
}

export function resolveLeaseDates(
  property: Property,
  lease?: LeasingRecord,
): { start?: string; end?: string } {
  return {
    start: lease?.leaseStart ?? property.leaseStart,
    end: lease?.leaseEnd ?? property.leaseEnd,
  };
}
