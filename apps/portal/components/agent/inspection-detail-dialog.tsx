'use client';

import { useMemo } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { AgentFieldInspectionDetail } from '@/components/inspections/agent-field-inspection-detail';
import { IngoingInspectionAgentDetail } from '@/components/inspections/ingoing-inspection-agent-detail';
import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { Button } from '@/components/ui/button';
import { inspectionEmailRecordsForStep } from '@/lib/inspection/agent-workflow-email';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
} from '@/lib/open-inspection';
import type { Inspection } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function InspectionDetailDialog({
  open,
  onClose,
  inspection,
  navContext,
  size = JOB_CASE_DIALOG_SIZE,
  canDelete = false,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  inspection: Inspection | null;
  navContext?: DetailNavContext;
  size?: 'default' | 'wide' | 'xl';
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const stageEmails = useMemo(
    () => (inspection ? inspectionEmailRecordsForStep(inspection) : []),
    [inspection],
  );

  if (!inspection) return null;
  const emailTitle =
    inspection.apiStatus === 'PUBLISHED' || inspection.reportStatus === 'sent'
      ? 'All e-mail'
      : undefined;

  const isFieldInspection =
    inspection.type === 'INGOING' || inspection.type === 'OUTGOING';

  if (isFieldInspection) {
    return (
      <CaseDetailDialog
        open={open}
        onClose={onClose}
        title={inspection.trackingNumber}
        subtitle={`${inspection.type} · ${inspection.propertyAddress}`}
        size={size}
      >
        {inspection.type === 'OUTGOING' ? (
          <AgentFieldInspectionDetail inspection={inspection} apiConnected={apiConnected} />
        ) : (
          <IngoingInspectionAgentDetail inspection={inspection} apiConnected={apiConnected} />
        )}
      </CaseDetailDialog>
    );
  }

  const isSelfOpen = inspection.type === 'OPEN' && inspection.openConductedBy === 'agent';
  const isCrossubOpen = inspection.type === 'OPEN' && inspection.openConductedBy === 'crossub';

  const deleteAction =
    canDelete && onDelete ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>
    ) : null;

  return (
    <CaseDetailDialog
      open={open}
      onClose={onClose}
      title={inspection.trackingNumber}
      subtitle={`${inspection.type} · ${inspection.propertyAddress}`}
      size={size}
      headerActions={deleteAction}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={inspection.status} />
          <span className="text-muted-foreground text-xs capitalize">
            Report: {inspection.reportStatus}
          </span>
        </div>

        {isCrossubOpen && inspection.openListingContext && (
          <div className="rounded-xl border bg-card p-3 text-xs">
            <dl className="grid gap-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Property context</dt>
                <dd className="text-right font-medium">
                  {OPEN_LISTING_CONTEXT_LABEL[inspection.openListingContext]}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {isSelfOpen && (
          <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>{SELF_OPEN_INSPECTION_DISCLAIMER}</p>
          </div>
        )}

        {isCrossubOpen && (
          <p className="text-muted-foreground rounded-xl border bg-secondary/20 p-3 text-xs">
            CROSSUB is arranging this open inspection and will contact listing contacts on your
            behalf.
          </p>
        )}

        <div className="rounded-xl border bg-card p-3 text-xs">
          <dl className="grid gap-2">
            {(inspection.inspector || isSelfOpen) && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Inspector</dt>
                <dd className="font-medium">
                  {isSelfOpen ? OPEN_CONDUCTED_BY_LABEL.agent : inspection.inspector}
                </dd>
              </div>
            )}
            {inspection.scheduledAt && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Scheduled</dt>
                <dd className="font-medium">{formatDateTime(inspection.scheduledAt)}</dd>
              </div>
            )}
            {inspection.keyStatus && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Key status</dt>
                <dd className="font-medium">{inspection.keyStatus}</dd>
              </div>
            )}
            {inspection.tenantAck && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tenant ack</dt>
                <dd className="font-medium capitalize">{inspection.tenantAck}</dd>
              </div>
            )}
            {inspection.routineMode && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Routine mode</dt>
                <dd className="font-medium capitalize">
                  {inspection.routineMode === 'self' ? 'Tenant self-inspection' : 'In-person'}
                </dd>
              </div>
            )}
            {inspection.nextDueDate && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Next due</dt>
                <dd className="font-medium">{formatDateTime(inspection.nextDueDate)}</dd>
              </div>
            )}
            {inspection.visitorCount != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Visitors captured</dt>
                <dd className="font-medium">{inspection.visitorCount}</dd>
              </div>
            )}
          </dl>
        </div>

        {inspection.areaOutcomes && inspection.areaOutcomes.length > 0 && (
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold">Area outcomes</p>
            <ul className="space-y-2 text-xs">
              {inspection.areaOutcomes.map((a) => (
                <li
                  key={a.area}
                  className="flex justify-between gap-2 border-b border-border pb-2 last:border-0"
                >
                  <span className="font-medium">{a.area}</span>
                  <span className="text-muted-foreground text-right">
                    {a.outcome}
                    {a.note ? ` — ${a.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {inspection.timeline.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Timeline
            </p>
            <Timeline entries={inspection.timeline} />
          </div>
        )}

        <JobCaseStageEmailHistory emails={stageEmails} title={emailTitle} />
      </div>
    </CaseDetailDialog>
  );
}
