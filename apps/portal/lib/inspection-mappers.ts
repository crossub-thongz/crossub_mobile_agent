import {
  INSPECTION_RECORD_STATUS,
  INSPECTION_RECORD_TYPE,
  type InspectionRecordStatus,
} from '@/constants/inspection-records';
import {
  SESSION_STATUS_LABEL,
  SessionStatusEnum,
  type OpenInspectionSession,
  type SessionStatus,
} from '@/constants/open-inspection-ops';
import { hasLeftTaskPool, furthestInspectionStatus } from '@/lib/inspection-approval';
import type { InspectionRecord } from '@/lib/inspections-types';
import { formatInspectorReassignmentLabel } from '@/lib/inspector-reassignment-label';
import { workflowEventToTimelineEntry } from '@/lib/open-inspection/linked-case-history';
import {
  AGENT_INGOING_GATE_LABEL,
  deriveAgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import {
  AGENT_OUTGOING_GATE_LABEL,
  deriveAgentOutgoingGateStatus,
} from '@/lib/outgoing-inspection-display';
import type { Inspection } from '@/lib/types';
import type { TimelineEntry } from '@/lib/types';
import { resolveOpenConductedByFromSession } from '@/lib/open-inspection/open-conducted-by';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';

export function caseAuditToTimeline(
  entries: InspectionRecord['caseAudit'],
): TimelineEntry[] {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    at: entry.at,
    actor: entry.actor,
    actorRole: entry.actor.toLowerCase().includes('tenant')
      ? 'tenant'
      : entry.actor.includes('@')
        ? 'agent'
        : 'system',
    title: entry.label,
    source: 'system' as const,
  }));
}

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
  record: InspectionRecord,
): Inspection['reportStatus'] {
  if (record.status === INSPECTION_RECORD_STATUS.PUBLISHED) return 'sent';
  if (record.status === INSPECTION_RECORD_STATUS.COMPLETED) {
    if (
      hasLeftTaskPool({
        completedAt: record.completedDate,
        approvedAt: record.approvedAt,
      })
    ) {
      return 'approved';
    }
    return record.reportUrl ? 'uploaded' : 'pending';
  }
  if (record.reportUrl) return 'uploaded';
  return 'pending';
}

export function mapInspectionRecordToView(record: InspectionRecord): Inspection {
  const type = RECORD_TYPE_VIEW[record.type] ?? 'ROUTINE';
  const timeline = caseAuditToTimeline(record.caseAudit);
  const view: Inspection = {
    id: record.id,
    trackingNumber: inspectionReferenceLabel(record.id, type),
    type,
    propertyId: record.propertyId ?? '',
    propertyAddress: record.propertyAddress ?? '—',
    inspector:
      formatInspectorReassignmentLabel(
        record.inspectorName,
        record.previousInspectorName,
      ) ?? undefined,
    scheduledAt: record.scheduledDate ?? record.inspectionDate ?? undefined,
    moveInDate: record.moveInDate ?? undefined,
    status: openInspectionStatusLabel(
      type,
      STATUS_LABEL[record.status] ?? record.status,
      record.status,
    ),
    apiStatus: record.status,
    reportStatus: reportStatusFromRecord(record),
    reportUrl: record.reportUrl ?? undefined,
    createdAt: record.createdAt,
    completedAt: record.completedDate ?? undefined,
    approvedAt: record.approvedAt ?? undefined,
    reportDeclineReason: record.reportDeclineReason ?? undefined,
    inspectorConfirmDeadlineAt: record.inspectorConfirmDeadlineAt ?? undefined,
    unacceptedRefunded: record.unacceptedRefunded === true,
    routineMode: record.routineFlow ?? undefined,
    cancelReason: record.cancelReason ?? undefined,
    timeline,
    source: 'inspection',
  };
  if (type === 'INGOING') {
    view.status = AGENT_INGOING_GATE_LABEL[deriveAgentIngoingGateStatus({ inspection: view, record })];
  } else if (type === 'OUTGOING') {
    view.status = AGENT_OUTGOING_GATE_LABEL[deriveAgentOutgoingGateStatus({ inspection: view, record })];
  }
  return view;
}

function inspectionFreshnessRank(row: Inspection): number {
  const order = [
    'CANCELLED',
    'DRAFT',
    'IN_PROGRESS',
    'FIRST_REVIEW',
    'SECOND_REVIEW',
    'COMPLETED',
    'PUBLISHED',
  ];
  const status = furthestInspectionStatus(row.apiStatus);
  const index = order.indexOf(status);
  let rank = index < 0 ? 0 : index;
  if (row.completedAt) rank += 0.5;
  if (row.approvedAt) rank += 10;
  return rank;
}

/** Prefer the further-along live row over a stale list snapshot. */
export function pickFresherInspection(current: Inspection, incoming: Inspection): Inspection {
  if (incoming.id !== current.id) return incoming;
  const winner =
    inspectionFreshnessRank(incoming) >= inspectionFreshnessRank(current)
      ? { ...current, ...incoming }
      : { ...incoming, ...current };
  return {
    ...winner,
    inspector: winner.inspector ?? current.inspector ?? incoming.inspector,
    reportUrl: winner.reportUrl ?? current.reportUrl ?? incoming.reportUrl,
    timeline:
      current.timeline.length >= incoming.timeline.length ? current.timeline : incoming.timeline,
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
    openConductedBy: resolveOpenConductedByFromSession(session),
    openListingContext,
    tenantMovedOut: session.tenantMovedOut,
    visitorCount: session.visitors?.length ?? 0,
    timeline: (session.timeline ?? []).map(workflowEventToTimelineEntry),
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

  const occupyingSessions = sessions.filter(
    (s) =>
      s.sessionStatus !== SessionStatusEnum.CANCELLED &&
      s.sessionStatus !== SessionStatusEnum.CLOSED &&
      !s.openReportGenerated,
  );
  const sessionIds = new Set(occupyingSessions.map((s) => s.id));
  const propertiesWithOpenSessions = new Set(
    occupyingSessions
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
