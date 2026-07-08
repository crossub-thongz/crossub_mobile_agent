'use client';

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { CaseWorkflowProgressCard } from '@/components/agent/case-workflow-progress-card';
import { DocumentViewer } from '@/components/agent/document-viewer';
import { StatusBadge } from '@/components/agent/status-badge';
import { StatusBanner } from '@/components/agent/status-banner';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { inspectionWorkflowProgress } from '@/lib/case-workflows';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
} from '@/lib/open-inspection';
import { formatDateTime } from '@/lib/utils';

export default function InspectionDetailPage() {
  const params = useParams();
  const { inspections } = useAgentData();
  const insp = inspections.find((i) => i.id === params.id);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const back = useBackNavigation(ROUTES.INSPECTIONS, 'Inspections');

  if (!insp) notFound();

  const workflow = inspectionWorkflowProgress(insp);
  const isSelfOpen = insp.type === 'OPEN' && insp.openConductedBy === 'agent';
  const isCrossubOpen = insp.type === 'OPEN' && insp.openConductedBy === 'crossub';

  return (
    <AgentShell title={insp.trackingNumber} backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <CaseWorkflowProgressCard progress={workflow} />

        <StatusBanner
          status={insp.status}
          subtitle={`${insp.type} · ${insp.propertyAddress}`}
          tone={insp.reportStatus === 'sent' ? 'ok' : 'default'}
        />

        {insp.type === 'OPEN' && insp.openConductedBy && (
          <div className="rounded-xl border bg-card p-4 text-xs">
            <dl className="grid gap-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Conducted by</dt>
                <dd className="text-right font-medium">
                  {OPEN_CONDUCTED_BY_LABEL[insp.openConductedBy]}
                </dd>
              </div>
              {insp.openListingContext && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Property context</dt>
                  <dd className="text-right font-medium">
                    {OPEN_LISTING_CONTEXT_LABEL[insp.openListingContext]}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {isSelfOpen && (
          <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-2">
              <p>{SELF_OPEN_INSPECTION_DISCLAIMER}</p>
              {insp.openListingContext === 'occupied' &&
                !insp.agentTenantNotifiedConfirmed && (
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Action required: notify the tenant of the open date and time.
                  </p>
                )}
              {insp.agentTenantNotifiedConfirmed && insp.agentTenantNotifiedAt && (
                <p className="text-muted-foreground">
                  Tenant notification confirmed{' '}
                  {formatDateTime(insp.agentTenantNotifiedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {isCrossubOpen && (
          <p className="text-muted-foreground rounded-xl border bg-secondary/20 p-3 text-xs">
            CROSSUB is arranging this open inspection and will contact the{' '}
            {insp.openListingContext === 'occupied' ? 'tenant' : 'listing contacts'} on your
            behalf.
          </p>
        )}

        <CaseContactActions propertyId={insp.propertyId} caseLabel={`${insp.type} inspection`} />

        <div className="rounded-xl border bg-card p-4 space-y-2 text-xs">
          <dl className="grid gap-2">
            {insp.inspector && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inspector</dt>
                <dd className="font-medium">{insp.inspector}</dd>
              </div>
            )}
            {insp.scheduledAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Scheduled</dt>
                <dd className="font-medium">{formatDateTime(insp.scheduledAt)}</dd>
              </div>
            )}
            {insp.keyStatus && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Key status</dt>
                <dd className="font-medium">{insp.keyStatus}</dd>
              </div>
            )}
            {insp.tenantAck && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tenant ack</dt>
                <dd className="font-medium capitalize">{insp.tenantAck}</dd>
              </div>
            )}
            {insp.routineMode && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Routine mode</dt>
                <dd className="font-medium capitalize">
                  {insp.routineMode === 'self' ? 'Tenant self-inspection' : 'In-person'}
                </dd>
              </div>
            )}
            {insp.nextDueDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Next due</dt>
                <dd className="font-medium">{formatDateTime(insp.nextDueDate)}</dd>
              </div>
            )}
            {insp.visitorCount != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Visitors captured</dt>
                <dd className="font-medium">{insp.visitorCount}</dd>
              </div>
            )}
          </dl>
        </div>

        {insp.type === 'OUTGOING' && insp.imageComparisons && (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Ingoing vs outgoing comparison</h2>
            <ul className="mt-3 space-y-3">
              {insp.imageComparisons.map((c) => (
                <li key={c.area} className="rounded-lg border p-3 text-xs">
                  <p className="font-semibold">{c.area}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-secondary/60 rounded-md p-2">
                      <p className="text-muted-foreground text-[10px] uppercase">Ingoing</p>
                      <p className="mt-1">{c.ingoingLabel}</p>
                    </div>
                    <div className="bg-secondary/60 rounded-md p-2">
                      <p className="text-muted-foreground text-[10px] uppercase">Outgoing</p>
                      <p className="mt-1">{c.outgoingLabel}</p>
                    </div>
                  </div>
                  {c.issueNote && (
                    <p className="text-muted-foreground mt-2">{c.issueNote}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {insp.type === 'OUTGOING' && insp.areaOutcomes && (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Area outcomes</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {insp.areaOutcomes.map((a) => (
                <li key={a.area} className="flex justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span className="font-medium">{a.area}</span>
                  <span className="text-muted-foreground text-right">
                    {a.outcome}
                    {a.note ? ` — ${a.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {insp.maintenanceEscalations && insp.maintenanceEscalations.length > 0 && (
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h2 className="text-sm font-semibold">Maintenance escalation</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {insp.maintenanceEscalations.map((e) => (
                <li key={e.label} className="flex justify-between">
                  <span>{e.label}</span>
                  <StatusBadge label={e.severity} priority={e.severity} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {(insp.reportStatus === 'sent' || insp.reportUrl) && (
          <>
            {!showReport ? (
              <Button variant="outline" className="w-full" onClick={() => setShowReport(true)}>
                View / download report
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
          </>
        )}

        {!acknowledged && insp.type === 'OUTGOING' && (
          <Button
            className="w-full"
            onClick={() => {
              setAcknowledged(true);
              toast.success('Follow-up acknowledged — logged to timeline');
            }}
          >
            Acknowledge inspection follow-up
          </Button>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <Timeline
            entries={[
              ...insp.timeline,
              ...(acknowledged
                ? [
                    {
                      id: 'ack',
                      at: new Date().toISOString(),
                      actor: 'You',
                      actorRole: 'agent' as const,
                      title: 'Inspection follow-up acknowledged',
                      source: 'app' as const,
                    },
                  ]
                : []),
            ]}
          />
        </section>
      </div>
    </AgentShell>
  );
}
