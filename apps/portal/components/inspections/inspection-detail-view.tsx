'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileText,
  Home,
  Key,
  Mail,
  MessageSquare,
  User,
  Users,
} from 'lucide-react';

import { AgentFieldInspectionDetail } from '@/components/inspections/agent-field-inspection-detail';
import { OpenInspectionApplicantPanel } from '@/components/open-inspection/open-inspection-applicant-panel';
import { OpenInspectionApplyShareCard } from '@/components/open-inspection/open-inspection-apply-share-card';
import { OpenInspectionRentalFacts } from '@/components/open-inspection/open-inspection-rental-facts';
import { OpenInspectionSessionRail } from '@/components/open-inspection/open-inspection-session-rail';
import { CaseWorkflowProgressCard } from '@/components/agent/case-workflow-progress-card';
import { DocumentViewer } from '@/components/agent/document-viewer';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { inspectionWorkflowProgress } from '@/lib/case-workflows';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import {
  INSPECTION_TYPE_LABEL,
  inspectionNextAction,
} from '@/lib/inspections/presentation';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { crossubWebOpenInspectionUrl } from '@/lib/crossub-web-url';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
} from '@/lib/open-inspection';
import { useInspectionDetailLiveSync } from '@/lib/use-inspection-detail-live-sync';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';

export function InspectionDetailView({ inspectionId }: { inspectionId: string }) {
  const { inspections, apiConnected } = useAgentData();
  const base = inspections.find((i) => i.id === inspectionId);
  const insp = useInspectionDetailLiveSync(base, apiConnected);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const back = useBackNavigation(ROUTES.INSPECTIONS, 'Inspections');

  const syncOpenSession = useCallback(async () => {
    if (!apiConnected || !insp || insp.source !== 'open_viewing') {
      setOpenSession(null);
      return;
    }
    try {
      const session = await openViewingsApi.get(insp.id);
      setOpenSession(session);
    } catch {
      setOpenSession(null);
    }
  }, [apiConnected, insp]);

  useEffect(() => {
    void syncOpenSession();
  }, [syncOpenSession]);

  useLivePoll(syncOpenSession, apiConnected && insp?.source === 'open_viewing');

  if (!insp) notFound();

  if (insp.type === 'INGOING' || insp.type === 'OUTGOING') {
    return <AgentFieldInspectionDetail inspection={insp} apiConnected={apiConnected} />;
  }

  const workflow = inspectionWorkflowProgress(insp);
  const nextAction = inspectionNextAction(insp);
  const isSelfOpen = insp.type === 'OPEN' && insp.openConductedBy === 'agent';
  const isCrossubOpen = insp.type === 'OPEN' && insp.openConductedBy === 'crossub';
  const inspectorLabel = isSelfOpen
    ? OPEN_CONDUCTED_BY_LABEL.agent
    : insp.inspector ?? 'Unassigned';
  const visitors = openSession?.visitors ?? [];
  const applicantsWithApplications = visitors.filter((v) => v.application);
  const approvedApplicants = applicantsWithApplications.filter(
    (v) => v.application?.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );
  const canGenerateReport =
    applicantsWithApplications.length > 0 && !reportGenerated;
  const hasReport = insp.reportStatus === 'sent' || Boolean(insp.reportUrl);

  const TypeIcon =
    insp.type === 'OPEN' ? DoorOpen : insp.type === 'ROUTINE' ? ClipboardList : Home;

  return (
    <div className="space-y-5">
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
            {insp.propertyId && (
              <Link
                href={propertyDetail(insp.propertyId)}
                className="text-primary inline-flex text-xs font-medium hover:underline"
              >
                View property
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <FactTile
            icon={Calendar}
            label="Scheduled"
            value={insp.scheduledAt ? formatDateTime(insp.scheduledAt) : 'Not set'}
          />
          <FactTile icon={User} label="Inspector" value={inspectorLabel} />
          {typeof insp.visitorCount === 'number' && (
            <FactTile
              icon={Users}
              label="Visitors"
              value={String(insp.visitorCount)}
            />
          )}
          <FactTile
            icon={FileText}
            label="Report"
            value={
              insp.reportStatus === 'sent'
                ? 'Sent'
                : insp.reportUrl
                  ? 'Available'
                  : 'Pending'
            }
          />
        </div>
      </section>

      {nextAction && (
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
          {hasReport && !showReport && (
            <Button size="sm" className="mt-3 h-8" onClick={() => setShowReport(true)}>
              View report
            </Button>
          )}
        </section>
      )}

      <CaseWorkflowProgressCard progress={workflow} />

      {isSelfOpen && (
        <Callout
          tone="warning"
          icon={AlertTriangle}
          title="You are running this open inspection"
          body={SELF_OPEN_INSPECTION_DISCLAIMER}
          footer={
            insp.openListingContext === 'occupied' && !insp.agentTenantNotifiedConfirmed ? (
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Action required: notify the tenant of the open date and time.
              </p>
            ) : insp.agentTenantNotifiedConfirmed && insp.agentTenantNotifiedAt ? (
              <p className="text-muted-foreground">
                Tenant notified {formatDateTime(insp.agentTenantNotifiedAt)}
              </p>
            ) : null
          }
        />
      )}

      {isCrossubOpen && (
        <Callout
          tone="info"
          title="CROSSUB is arranging this open inspection"
          body={`CROSSUB will contact the ${
            insp.openListingContext === 'occupied' ? 'tenant' : 'listing contacts'
          } and manage scheduling on your behalf.`}
        />
      )}

      {isCrossubOpen && insp.openListingContext && (
        <InfoSection title="Open inspection details">
          <InfoRow
            label="Property context"
            value={OPEN_LISTING_CONTEXT_LABEL[insp.openListingContext]}
          />
        </InfoSection>
      )}

      {(insp.keyStatus || insp.tenantAck || insp.routineMode || insp.nextDueDate) && (
        <InfoSection title="Job details">
          {insp.keyStatus && <InfoRow label="Key status" value={insp.keyStatus} icon={Key} />}
          {insp.tenantAck && (
            <InfoRow label="Tenant acknowledgement" value={insp.tenantAck} icon={CheckCircle2} />
          )}
          {insp.routineMode && (
            <InfoRow
              label="Routine mode"
              value={insp.routineMode === 'self' ? 'Tenant self-inspection' : 'In-person'}
            />
          )}
          {insp.nextDueDate && (
            <InfoRow label="Next due" value={formatDateTime(insp.nextDueDate)} icon={Calendar} />
          )}
        </InfoSection>
      )}

      {openSession && insp.source === 'open_viewing' ? (
        <section className="rounded-2xl border bg-card px-2 py-1">
          <OpenInspectionSessionRail session={openSession} reportGenerated={reportGenerated} />
        </section>
      ) : null}

      {openSession && insp.source === 'open_viewing' ? (
        <OpenInspectionRentalFacts rental={openSession.rental} />
      ) : null}

      {openSession && insp.source === 'open_viewing' ? (
        <OpenInspectionApplyShareCard session={openSession} />
      ) : null}

      {openSession && insp.source === 'open_viewing' ? (
        <InfoSection title={`Applicants (${applicantsWithApplications.length})`}>
          <OpenInspectionApplicantPanel
            session={openSession}
            onSessionChange={(session) => {
              setOpenSession(session);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={!canGenerateReport || generatingReport}
              onClick={async () => {
                setGeneratingReport(true);
                try {
                  await openViewingsApi.generateReport(openSession.id);
                  setReportGenerated(true);
                  toast.success('Open report generated — New Leasing open-report step complete');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not generate report');
                } finally {
                  setGeneratingReport(false);
                }
              }}
            >
              <FileText className="size-3.5" />
              {generatingReport ? 'Generating…' : 'Generate open report'}
            </Button>
            {(reportGenerated || approvedApplicants.length > 0) && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <a href={openViewingsApi.reportPdfUrl(openSession.id)} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-3.5" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </InfoSection>
      ) : null}

      {visitors.length > 0 && !(openSession && insp.source === 'open_viewing') && (
        <InfoSection title={`Applicants (${visitors.length})`}>
          <ul className="space-y-2">
            {visitors.map((visitor) => (
              <li key={visitor.id} className="rounded-xl border bg-background px-3 py-2.5 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{visitor.name}</p>
                  {visitor.application ? (
                    <StatusBadge label={visitor.application.agentDecision} />
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {visitor.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {visitor.email}
                    </span>
                  )}
                  {visitor.phone && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {visitor.phone}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 capitalize">
                  {visitor.registrationSource.replace(/_/g, ' ')} ·{' '}
                  {visitor.attendanceStatus.replace(/_/g, ' ')}
                  {visitor.application ? ' · application submitted' : ''}
                </p>
              </li>
            ))}
          </ul>
          {insp.propertyId ? (
            <Button asChild size="sm" variant="outline" className="mt-3 h-8 gap-1.5 text-xs">
              <a
                href={crossubWebOpenInspectionUrl(insp.propertyId, insp.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage in staff portal
              </a>
            </Button>
          ) : null}
        </InfoSection>
      )}

      {insp.maintenanceEscalations && insp.maintenanceEscalations.length > 0 && (
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
      )}

      {hasReport && (
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
      )}

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Activity</h2>
        <Timeline entries={insp.timeline} />
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
        {Icon && <Icon className="size-3.5 shrink-0" />}
        {label}
      </dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}

function Callout({
  tone,
  icon: Icon,
  title,
  body,
  footer,
}: {
  tone: 'warning' | 'info';
  icon?: typeof AlertTriangle;
  title: string;
  body: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 text-xs',
        tone === 'warning' && 'border-amber-500/40 bg-amber-500/10',
        tone === 'info' && 'border-border bg-secondary/20',
      )}
    >
      <div className="flex gap-2">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-amber-600" />}
        <div className="space-y-2">
          <p className="text-sm font-semibold">{title}</p>
          <p className="leading-relaxed">{body}</p>
          {footer}
        </div>
      </div>
    </div>
  );
}
