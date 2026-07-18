import {
  INSPECTION_RECORD_STATUS,
  INSPECTION_RECORD_TYPE,
  type InspectionRecordStatus,
} from '@/constants/inspection-records';
import {
  SESSION_STATUS_LABEL,
  SessionStatusEnum,
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import type { InspectionRecord } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';

const RECORD_TYPE_VIEW: Record<string, Inspection['type']> = {
  INGOING: 'INGOING',
  OUTGOING: 'OUTGOING',
  ROUTINE: 'ROUTINE',
  OPEN: 'OPEN',
};

const OPEN_DELETED_LABEL = 'Deleted';

function openInspectionStatusLabel(
  type: Inspection['type'],
  status: string,
  apiStatus?: string,
): string {
  const raw = (apiStatus ?? status).toLowerCase();
  if (type === 'OPEN' && (raw === 'cancelled' || raw === SessionStatusEnum.CANCELLED)) {
    return OPEN_DELETED_LABEL;
  }
  return status;
}

const STATUS_LABEL: Record<InspectionRecordStatus, string> = {
  [INSPECTION_RECORD_STATUS.DRAFT]: 'Draft',
  [INSPECTION_RECORD_STATUS.IN_PROGRESS]: 'In Progress',
  [INSPECTION_RECORD_STATUS.FIRST_REVIEW]: 'First Review',
  [INSPECTION_RECORD_STATUS.SECOND_REVIEW]: 'Second Review',
  [INSPECTION_RECORD_STATUS.COMPLETED]: 'Completed',
  [INSPECTION_RECORD_STATUS.PUBLISHED]: 'Published',
  [INSPECTION_RECORD_STATUS.CANCELLED]: 'Cancelled',
};

function reportStatusFromRecord(
  status: InspectionRecordStatus,
  reportUrl: string | null,
): Inspection['reportStatus'] {
  if (status === INSPECTION_RECORD_STATUS.PUBLISHED) return 'sent';
  if (status === INSPECTION_RECORD_STATUS.COMPLETED) return 'approved';
  if (reportUrl) return 'uploaded';
  return 'pending';
}

export function mapInspectionRecordToView(record: InspectionRecord): Inspection {
  const type = RECORD_TYPE_VIEW[record.type] ?? 'ROUTINE';
  return {
    id: record.id,
    trackingNumber: inspectionReferenceLabel(record.id, type),
    type,
    propertyId: record.propertyId ?? '',
    propertyAddress: record.propertyAddress ?? '—',
    inspector: record.inspectorName ?? undefined,
    scheduledAt: record.scheduledDate ?? record.inspectionDate ?? undefined,
    status: openInspectionStatusLabel(
      type,
      STATUS_LABEL[record.status] ?? record.status,
      record.status,
    ),
    apiStatus: record.status,
    reportStatus: reportStatusFromRecord(record.status, record.reportUrl),
    reportUrl: record.reportUrl ?? undefined,
    createdAt: record.createdAt,
    timeline: [],
    source: 'inspection',
  };
}

function openSessionStatusLabel(status: SessionStatus): string {
  if (status === SessionStatusEnum.CANCELLED) return OPEN_DELETED_LABEL;
  return SESSION_STATUS_LABEL[status] ?? status;
}

/** Map an open-viewing session into the agent Inspection list row. */
export function mapOpenSessionToInspection(
  session: OpenInspectionSession,
  propertyId?: string,
): Inspection {
  const resolvedPropertyId = session.propertyId ?? propertyId ?? '';
  const openListingContext =
    session.tenantMovedOut === false
      ? 'occupied'
      : session.tenantMovedOut === true
        ? 'new_listing'
        : undefined;
  return {
    id: session.id,
    trackingNumber: inspectionReferenceLabel(session.id, 'OPEN'),
    type: 'OPEN',
    propertyId: resolvedPropertyId,
    propertyAddress: session.address || session.property,
    scheduledAt: session.startTime,
    createdAt: session.createdAt,
    status:
      session.sessionStatus === SessionStatusEnum.CANCELLED
        ? OPEN_DELETED_LABEL
        : session.openReportGenerated ||
            session.sessionStatus === SessionStatusEnum.CLOSED
          ? 'Completed'
          : openSessionStatusLabel(session.sessionStatus),
    apiStatus:
      session.sessionStatus === SessionStatusEnum.CANCELLED
        ? SessionStatusEnum.CANCELLED
        : session.openReportGenerated ||
            session.sessionStatus === SessionStatusEnum.CLOSED
          ? SessionStatusEnum.CLOSED
          : session.sessionStatus,
    reportStatus: session.openReportGenerated ? 'sent' : 'pending',
    openConductedBy: session.agent?.role === 'leasing_agent' ? 'agent' : 'crossub',
    openListingContext,
    tenantMovedOut: session.tenantMovedOut,
    visitorCount: session.visitors?.length ?? 0,
    timeline: [],
    source: 'open_viewing',
  };
}

export function mergeInspectionRows(
  records: InspectionRecord[],
  sessions: OpenInspectionSession[],
  propertyIdByAddress: Map<string, string>,
): Inspection[] {
  const fromOpenRecords = records
    .filter((r) => r.type === INSPECTION_RECORD_TYPE.OPEN)
    .map(mapInspectionRecordToView);

  const activeSessions = sessions.filter(
    (s) => s.sessionStatus !== SessionStatusEnum.CANCELLED,
  );
  const sessionIds = new Set(activeSessions.map((s) => s.id));
  const propertiesWithOpenSessions = new Set(
    activeSessions
      .map(
        (s) =>
          s.propertyId ?? propertyIdByAddress.get(s.address.toLowerCase().trim()) ?? '',
      )
      .filter(Boolean),
  );

  const isCancelledOpenRecord = (r: Inspection) =>
    (r.apiStatus ?? r.status).toLowerCase() === INSPECTION_RECORD_STATUS.CANCELLED.toLowerCase() ||
    r.status.toLowerCase() === 'deleted';

  // Deleted OPEN pool jobs stay visible under History → Deleted.
  const deletedOpenRecords = fromOpenRecords.filter(isCancelledOpenRecord);

  // Pool-only OPEN rows (no viewing session yet). Never surface a cancelled pool
  // job as an active case when another open session exists on the property.
  const orphanOpenRecords = fromOpenRecords.filter(
    (r) =>
      !isCancelledOpenRecord(r) &&
      r.propertyId &&
      !sessionIds.has(r.id) &&
      !propertiesWithOpenSessions.has(r.propertyId),
  );

  const fromRecords = records
    .filter((r) => r.type !== INSPECTION_RECORD_TYPE.OPEN)
    .map(mapInspectionRecordToView);

  const fromSessions = sessions.map((s) => {
      const propertyId =
        s.propertyId ?? propertyIdByAddress.get(s.address.toLowerCase().trim());
      return mapOpenSessionToInspection(s, propertyId);
    });

  const merged = [
    ...fromSessions,
    ...orphanOpenRecords,
    ...deletedOpenRecords,
    ...fromRecords,
  ];
  merged.sort((a, b) => {
    const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return bt - at;
  });
  return merged;
}
