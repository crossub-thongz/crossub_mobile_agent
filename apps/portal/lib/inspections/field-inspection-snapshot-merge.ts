import { furthestInspectionStatus } from '@/lib/inspection-approval';
import type {
  InspectionDetail,
  InspectionRecord,
  KeyCustodyProgress,
  OnSiteProgression,
} from '@/lib/inspections-types';

function statusRank(status: string | null | undefined): number {
  const order = [
    'CANCELLED',
    'DRAFT',
    'IN_PROGRESS',
    'FIRST_REVIEW',
    'SECOND_REVIEW',
    'COMPLETED',
    'PUBLISHED',
  ];
  const index = order.indexOf((status ?? '').toUpperCase());
  return index < 0 ? 0 : index;
}

function preferLongerList<T>(a: T[], b: T[]): T[] {
  return a.length >= b.length ? a : b;
}

function mergeKeyCustody(
  prev: KeyCustodyProgress | undefined,
  next: KeyCustodyProgress | undefined,
): KeyCustodyProgress | undefined {
  if (!next) return prev;
  if (!prev) return next;
  return {
    collectedAt: next.collectedAt ?? prev.collectedAt,
    collectPhotos: preferLongerList(next.collectPhotos, prev.collectPhotos),
    collectNotes: next.collectNotes ?? prev.collectNotes,
    returnedAt: next.returnedAt ?? prev.returnedAt,
    returnPhotos: preferLongerList(next.returnPhotos, prev.returnPhotos),
    returnNotes: next.returnNotes ?? prev.returnNotes,
    collectComplete: next.collectComplete || prev.collectComplete,
    returnComplete: next.returnComplete || prev.returnComplete,
  };
}

/** Keep the further-along inspection row when a poll returns sparse or stale data. */
export function mergeInspectionRecord(
  prev: InspectionRecord | null,
  next: InspectionRecord | null,
): InspectionRecord | null {
  if (!next) return prev;
  if (!prev) return next;

  const winner = statusRank(next.status) >= statusRank(prev.status) ? next : prev;
  const loser = winner === next ? prev : next;

  return {
    ...loser,
    ...winner,
    status: furthestInspectionStatus(
      prev.status,
      next.status,
    ) as InspectionRecord['status'],
    reportUrl: winner.reportUrl ?? loser.reportUrl,
    completedDate: winner.completedDate ?? loser.completedDate,
    approvedAt: winner.approvedAt ?? loser.approvedAt,
    tenantReportSigned: winner.tenantReportSigned ?? loser.tenantReportSigned,
    workflowPhase: winner.workflowPhase ?? loser.workflowPhase,
    inspectorName: winner.inspectorName ?? loser.inspectorName,
    previousInspectorName: winner.previousInspectorName ?? loser.previousInspectorName,
    caseAudit: preferLongerList(winner.caseAudit ?? [], loser.caseAudit ?? []),
    caseEmails: preferLongerList(winner.caseEmails ?? [], loser.caseEmails ?? []),
  };
}

export function mergeOnSiteProgression(
  prev: OnSiteProgression | null,
  next: OnSiteProgression | null,
): OnSiteProgression | null {
  if (!next) return prev;
  if (!prev) return next;

  const mergedCustody = mergeKeyCustody(prev.keyCustody, next.keyCustody);

  return {
    ...prev,
    ...next,
    inspectionStatus:
      furthestInspectionStatus(prev.inspectionStatus, next.inspectionStatus) ||
      next.inspectionStatus,
    keyCustody: mergedCustody ?? prev.keyCustody,
    reportUrl: next.reportUrl ?? prev.reportUrl,
    fieldPhotoCount: Math.max(prev.fieldPhotoCount, next.fieldPhotoCount),
    inspectorName: next.inspectorName ?? prev.inspectorName,
    assignedInspectorId: next.assignedInspectorId ?? prev.assignedInspectorId,
  };
}

export function mergeInspectionDetail(
  prev: InspectionDetail | null,
  next: InspectionDetail | null,
): InspectionDetail | null {
  if (!next) return prev;
  if (!prev) return next;

  const mergedRecord = mergeInspectionRecord(prev, next);
  if (!mergedRecord) return next;

  return {
    ...mergedRecord,
    areas: preferLongerList(next.areas, prev.areas),
    inspectionPhotos: preferLongerList(next.inspectionPhotos, prev.inspectionPhotos),
    checkIns: preferLongerList(next.checkIns, prev.checkIns),
    signName: next.signName ?? prev.signName,
    signUrl: next.signUrl ?? prev.signUrl,
    propertyFullAddress: next.propertyFullAddress ?? prev.propertyFullAddress,
    propertyType: next.propertyType ?? prev.propertyType,
    propertyTypeLabel: next.propertyTypeLabel ?? prev.propertyTypeLabel,
    weeklyRent: next.weeklyRent ?? prev.weeklyRent,
    referenceIngoing: next.referenceIngoing ?? prev.referenceIngoing,
  };
}

export function mergeReportUrl(
  ...urls: Array<string | null | undefined>
): string | null {
  for (const url of urls) {
    if (url?.trim()) return url;
  }
  return null;
}
