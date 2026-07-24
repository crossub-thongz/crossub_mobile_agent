'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  Key,
  Loader2,
  User,
} from 'lucide-react';

import { AgentFieldInspectionDetail } from '@/components/inspections/agent-field-inspection-detail';
import { InspectionCompareEvidenceSection } from '@/components/inspections/inspection-compare-evidence-section';
import { RoutineSelfInspectionReviewSection } from '@/components/inspections/routine-self-inspection-review-section';
import { RoutineSelfPreviousSubmissionSection } from '@/components/inspections/routine-self-previous-submission-section';
import { RoutineInPersonKeyCustodySection } from '@/components/inspections/routine-in-person-key-custody-section';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { DocumentViewer } from '@/components/agent/document-viewer';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, inspectionDetail } from '@/constants/routes';
import type { DetailNavContext } from '@/lib/detail-navigation';
import { inspectionEmailRecordsForStep } from '@/lib/inspection/agent-workflow-email';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import { INSPECTION_TYPE_LABEL, inspectionNextAction } from '@/lib/inspections/presentation';
import { useInspectionDetailLiveSync } from '@/lib/use-inspection-detail-live-sync';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  routineInspectionApi,
  type ServerRoutineScheduleView,
} from '@/lib/routine-inspection-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

export function InspectionDetailView({
  inspectionId,
  embedded = false,
  navContext,
  onClose,
}: {
  inspectionId: string;
  embedded?: boolean;
  navContext?: DetailNavContext;
  onClose?: () => void;
}) {
  const { inspections, apiConnected, registerInspection } = useAgentData();
  const baseFromList = inspections.find((i) => i.id === inspectionId);
  const [fetchedBase, setFetchedBase] = useState<Inspection | null>(null);
  const [resolveState, setResolveState] = useState<'pending' | 'ready' | 'missing'>(
    baseFromList ? 'ready' : 'pending',
  );

  useEffect(() => {
    if (baseFromList) {
      setFetchedBase(null);
      setResolveState('ready');
      return;
    }

    if (!apiConnected) {
      setResolveState('missing');
      return;
    }

    let cancelled = false;
    setResolveState('pending');
    void inspectionsApi
      .get(inspectionId)
      .then((record) => {
        if (cancelled) return;
        const mapped = mapInspectionRecordToView(record);
        registerInspection(mapped);
        setFetchedBase(mapped);
        setResolveState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setResolveState('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, baseFromList, inspectionId, registerInspection]);

  const base = baseFromList ?? fetchedBase;
  const liveInsp = useInspectionDetailLiveSync(
    base,
    apiConnected && base != null && base.type !== 'OPEN',
  );
  const insp = liveInsp ?? base;

  const stageEmails = useMemo(() => {
    if (!insp) return [];
    return inspectionEmailRecordsForStep(insp);
  }, [insp]);

  const [showReport, setShowReport] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [routineDetail, setRoutineDetail] = useState<InspectionDetail | null>(null);
  const [routineSchedule, setRoutineSchedule] = useState<ServerRoutineScheduleView | null>(null);

  useEffect(() => {
    if (!apiConnected || !insp || insp.type !== 'ROUTINE') {
      setRoutineDetail(null);
      setRoutineSchedule(null);
      return;
    }
    let cancelled = false;
    void inspectionsApi
      .getDetail(insp.id)
      .then((detail) => {
        if (!cancelled) setRoutineDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setRoutineDetail(null);
      });
    void routineInspectionApi
      .getByInspection(insp.id)
      .then((schedule) => {
        if (!cancelled) setRoutineSchedule(schedule);
      })
      .catch(() => {
        if (!cancelled) setRoutineSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiConnected, insp?.id, insp?.type]);

  useRecordRecentCaseVisit({
    id: base?.id,
    kind:
      base?.type === 'OPEN'
        ? 'open'
        : base?.type === 'INGOING'
          ? 'ingoing'
          : base?.type === 'OUTGOING'
            ? 'outgoing'
            : 'routine',
    address: base?.propertyAddress,
    href: base ? inspectionDetail(base.id) : '',
    module: 'inspection',
  });

  if (resolveState === 'pending') {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading inspection…
      </div>
    );
  }

  if (resolveState === 'missing' || !insp) {
    if (embedded) {
      return (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Could not load this inspection job case.
        </p>
      );
    }
    notFound();
  }

  if (insp.type === 'INGOING' || insp.type === 'OUTGOING' || insp.type === 'OPEN') {
    return (
      <AgentFieldInspectionDetail
        inspection={insp}
        apiConnected={apiConnected}
        embedded={embedded}
        onClose={onClose}
      />
    );
  }

  const nextAction = inspectionNextAction(insp);
  const hasReport = insp.reportStatus === 'sent' || Boolean(insp.reportUrl);
  const TypeIcon = insp.type === 'ROUTINE' ? ClipboardList : Home;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <TypeIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-secondary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {INSPECTION_TYPE_LABEL[insp.type]}
                </span>
                <StatusBadge label={insp.status} />
              </div>
              <h1 className="text-base font-semibold leading-snug">{insp.propertyAddress}</h1>
              <p className="text-muted-foreground text-xs">Case ref {insp.trackingNumber}</p>
              {insp.propertyId ? (
                <Link
                  href={propertyDetail(insp.propertyId)}
                  className="text-primary inline-flex text-xs font-medium hover:underline"
                >
                  View property
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <FactTile
              icon={Calendar}
              label="Scheduled"
              value={insp.scheduledAt ? formatDateTime(insp.scheduledAt) : 'Not set'}
            />
            <FactTile icon={User} label="Inspector" value={insp.inspector ?? 'Unassigned'} />
            <FactTile
              icon={FileText}
              label="Report"
              value={
                insp.reportStatus === 'sent'
                  ? 'Complete'
                  : insp.reportUrl
                    ? 'Available'
                    : 'Pending'
              }
            />
          </div>
        </section>
      ) : null}

      {nextAction ? (
        <section
          className={cn(
            'rounded-2xl border p-4',
            nextAction.tone === 'warning' && 'border-amber-500/40 bg-amber-500/10',
            nextAction.tone === 'success' && 'border-primary/30 bg-primary/5',
            nextAction.tone === 'info' && 'border-sky-500/30 bg-sky-500/5',
            nextAction.tone === 'default' && 'bg-secondary/20',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">What to do next</p>
          <p className="mt-1 text-sm font-semibold">{nextAction.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{nextAction.description}</p>
          {hasReport && !showReport ? (
            <Button size="sm" className="mt-3 h-8" onClick={() => setShowReport(true)}>
              View report
            </Button>
          ) : null}
        </section>
      ) : null}

      {(insp.keyStatus || insp.tenantAck || insp.routineMode || insp.nextDueDate) && (
        <InfoSection title="Job details">
          {insp.keyStatus ? <InfoRow label="Key status" value={insp.keyStatus} icon={Key} /> : null}
          {insp.tenantAck ? (
            <InfoRow label="Tenant acknowledgement" value={insp.tenantAck} icon={CheckCircle2} />
          ) : null}
          {insp.routineMode ? (
            <InfoRow
              label="Routine mode"
              value={insp.routineMode === 'self' ? 'Tenant self-inspection' : 'In-person'}
            />
          ) : null}
          {insp.nextDueDate ? (
            <InfoRow label="Next due" value={formatDateTime(insp.nextDueDate)} icon={Calendar} />
          ) : null}
        </InfoSection>
      )}

      {insp.type === 'ROUTINE' &&
      (routineSchedule?.flow ?? insp.routineMode) === 'in_person' &&
      insp.id ? (
        <RoutineInPersonKeyCustodySection
          inspectionId={insp.id}
          apiConnected={apiConnected}
          inspectorAssigned={Boolean(insp.inspector && insp.inspector !== 'Unassigned')}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule?.currentInspection?.previousSubmission ? (
        <RoutineSelfPreviousSubmissionSection
          submission={routineSchedule.currentInspection.previousSubmission}
          propertyLabel={insp.propertyAddress}
          inspectionRecordId={
            routineSchedule.currentInspectionId ?? routineSchedule.currentInspection.id
          }
          declineReason={routineSchedule.currentInspection.declineReason}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule?.currentInspection?.declineReason ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
          Awaiting tenant to re-upload the routine self-inspection.
        </div>
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule ? (
        <RoutineSelfInspectionReviewSection
          schedule={routineSchedule}
          propertyLabel={insp.propertyAddress}
          onUpdated={setRoutineSchedule}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineDetail ? (
        <InspectionCompareEvidenceSection
          detail={routineDetail}
          currentLabel="Routine"
          title={
            (routineSchedule?.flow ?? insp.routineMode) === 'self'
              ? 'Tenant self-inspection photos'
              : 'Routine vs latest ingoing'
          }
          showReferenceIngoing={(routineSchedule?.flow ?? insp.routineMode) !== 'self'}
        />
      ) : null}

      {insp.maintenanceEscalations && insp.maintenanceEscalations.length > 0 ? (
        <InfoSection title="Maintenance escalation">
          <ul className="space-y-2 text-xs">
            {insp.maintenanceEscalations.map((e) => (
              <li key={e.label} className="flex items-center justify-between gap-2">
                <span>{e.label}</span>
                <StatusBadge label={e.severity} priority={e.severity} />
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      {hasReport ? (
        <section className="space-y-3">
          {!showReport ? (
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setShowReport(true)}>
              <FileText className="size-4" />
              View inspection report
            </Button>
          ) : (
            <DocumentViewer
              title={`${insp.type} inspection report`}
              propertyAddress={insp.propertyAddress}
              category="inspection"
              downloadUrl={insp.reportUrl}
              onClose={() => setShowReport(false)}
            />
          )}
        </section>
      ) : null}

      <JobCaseStageEmailHistory emails={stageEmails} />

      <section className="rounded-2xl border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setActivityExpanded((value) => !value)}
          aria-expanded={activityExpanded}
        >
          <span className="text-sm font-semibold">Activity</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {insp.timeline.length} event{insp.timeline.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', activityExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {activityExpanded ? (
          <div className="border-t px-4 py-3">
            <Timeline entries={insp.timeline} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FactTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-secondary/30 rounded-xl px-3 py-2.5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Calendar;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 text-xs last:border-0">
      <dt className="text-muted-foreground inline-flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
        {label}
      </dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
