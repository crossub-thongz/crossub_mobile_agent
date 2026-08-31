import {
  INSPECTION_TYPE_LABEL,
  inspectionNextAction,
  isInspectionCancelled,
  isInspectionDone,
} from '@/lib/inspections/presentation';
import type { Inspection } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { inspectionCaseReferenceLabel, type InspectionCaseRefKind } from '@/lib/workflow-case-reference';

export const INSPECTION_TASK_STAGE_LABELS = [
  'Scheduled',
  'Confirmed',
  'In progress',
  'Report available',
  'Completed',
] as const;

export type InspectionTaskTab = 'workflow' | 'details' | 'activity' | 'documents' | 'notes';

export type InspectionTaskStageState = 'complete' | 'current' | 'pending';

export function inspectionTaskReference(inspection: Inspection): string {
  if (inspection.trackingNumber) return inspection.trackingNumber;
  const kind: InspectionCaseRefKind =
    inspection.type === 'INGOING'
      ? 'ingoing'
      : inspection.type === 'OUTGOING'
        ? 'outgoing'
        : inspection.type === 'OPEN'
          ? 'open'
          : 'routine';
  return inspectionCaseReferenceLabel(inspection.id, kind);
}

export function resolveInspectionTaskStageIndex(inspection: Inspection): number {
  if (isInspectionDone(inspection)) return 4;
  if (inspection.reportStatus === 'sent' || Boolean(inspection.reportUrl)) return 3;
  const status = `${inspection.apiStatus ?? ''} ${inspection.status}`.toLowerCase();
  if (status.includes('open') || status.includes('progress') || status.includes('on_site')) {
    return 2;
  }
  if (inspection.scheduledAt || status.includes('confirm') || status.includes('assigned')) {
    return 1;
  }
  return 0;
}

export function buildInspectionTaskStages(inspection: Inspection): {
  label: string;
  state: InspectionTaskStageState;
  dateLabel?: string;
}[] {
  const currentIndex = resolveInspectionTaskStageIndex(inspection);
  return INSPECTION_TASK_STAGE_LABELS.map((label, index) => {
    let state: InspectionTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel:
        index === 0 && inspection.scheduledAt
          ? formatDate(inspection.scheduledAt)
          : index === 4 && inspection.completedAt
            ? formatDate(inspection.completedAt)
            : undefined,
    };
  });
}

export function resolveInspectionStatusBanner(inspection: Inspection): {
  title: string;
  subtitle: string;
  crosSummary: string;
  needsAction: boolean;
  statusLabel: string;
} {
  const next = inspectionNextAction(inspection, { distinguishCancelled: true });
  const needsAction = next?.tone === 'warning';
  const cancelled = isInspectionCancelled(inspection);
  const done = isInspectionDone(inspection);

  return {
    title: next?.title ?? inspection.status,
    subtitle: next?.description ?? 'This inspection is in progress.',
    crosSummary:
      next?.description ||
      'CROSSUB is tracking this inspection and will surface anything that needs your review.',
    needsAction,
    statusLabel: needsAction
      ? 'Need your action'
      : cancelled
        ? 'Cancelled'
        : done
          ? 'Completed'
          : 'CROS handling',
  };
}

export function buildInspectionDetailRows(inspection: Inspection): { label: string; value: string }[] {
  return [
    { label: 'Type', value: INSPECTION_TYPE_LABEL[inspection.type] },
    { label: 'Status', value: inspection.status || '—' },
    { label: 'Inspector', value: inspection.inspector || 'CROSSUB' },
    {
      label: 'Scheduled',
      value: inspection.scheduledAt ? formatDateTime(inspection.scheduledAt) : '—',
    },
    {
      label: 'Created',
      value: inspection.createdAt ? formatDate(inspection.createdAt) : '—',
    },
    {
      label: 'Due',
      value: inspection.nextDueDate ? formatDate(inspection.nextDueDate) : '—',
    },
    { label: 'Report', value: inspection.reportStatus || '—' },
    { label: 'Reference', value: inspectionTaskReference(inspection) },
  ];
}

export function buildInspectionActivityEntries(inspection: Inspection): {
  id: string;
  at: string;
  title: string;
  detail?: string;
}[] {
  return [...(inspection.timeline ?? [])]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      title: entry.title,
      detail: entry.detail,
    }));
}
