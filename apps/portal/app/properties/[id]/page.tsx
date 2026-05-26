'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';

import { ChatCrossubBar } from '@/components/agent/chat-crossub-bar';
import { StatusBanner } from '@/components/agent/status-banner';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  ROUTES,
  vacatingDetail,
} from '@/constants/routes';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const TABS = ['Overview', 'Tasks', 'Timeline', 'Documents'] as const;

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { properties, maintenanceAll, inspections, rentReviews, vacating, documents } =
    useAgentData();
  const property = properties.find((p) => p.id === id);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  if (!property) notFound();

  const tasks = {
    maintenance: maintenanceAll.filter((m) => m.propertyId === id || m.propertyAddress.includes(property.address.split(',')[0])),
    inspections: inspections.filter((i) => i.propertyId === id),
    rentReviews: rentReviews.filter((r) => r.propertyId === id),
    vacating: vacating.filter((v) => v.propertyId === id),
  };
  const propertyDocs = documents.filter((d) =>
    d.propertyAddress.includes(property.address.split(',')[0]),
  );
  const timeline = [
    ...tasks.maintenance.flatMap((m) => m.timeline),
    ...tasks.inspections.flatMap((i) => i.timeline),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <AgentShell title={property.address} backHref={ROUTES.PROPERTIES}>
      <div className="space-y-4">
        <StatusBanner
          status={property.leaseStatus}
          subtitle={`${property.homeOwnerName} · ${property.tenantName}`}
        />

        <ChatCrossubBar taskLabel={property.address} />

        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground text-xs">{property.suburb}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {property.rentWeekly > 0 && (
              <span className="text-sm font-medium">
                {formatCurrency(property.rentWeekly)}/wk
              </span>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Landlord</dt>
              <dd className="font-medium">{property.homeOwnerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tenant</dt>
              <dd className="font-medium">{property.tenantName}</dd>
            </div>
            {property.nextRentReview && (
              <div>
                <dt className="text-muted-foreground">Next rent review</dt>
                <dd className="font-medium">{formatDate(property.nextRentReview)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                tab === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Inspection</dt>
                <dd className="font-medium">{property.inspectionStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Maintenance</dt>
                <dd className="font-medium">{property.maintenanceStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Open tasks</dt>
                <dd className="font-medium">{property.openTasks}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lease status</dt>
                <dd className="font-medium capitalize">{property.leaseStatus}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Property hub — use Tasks for active work, Timeline for audit history,
              and Documents for lease, reports, and invoices.
            </p>
          </div>
        )}

        {tab === 'Tasks' && (
          <div className="space-y-2">
            {tasks.maintenance.map((m) => (
              <TaskLink key={m.id} href={maintenanceDetail(m.id)} title={m.title} status={m.status} approval={m.requiresApproval} />
            ))}
            {tasks.inspections.map((i) => (
              <TaskLink key={i.id} href={inspectionDetail(i.id)} title={`${i.type} — ${i.trackingNumber}`} status={i.status} />
            ))}
            {tasks.rentReviews.map((r) => (
              <TaskLink key={r.id} href={rentReviewDetail(r.id)} title="Rent review" status={r.status} approval={r.requiresApproval} />
            ))}
            {tasks.vacating.map((v) => (
              <TaskLink key={v.id} href={vacatingDetail(v.id)} title="Vacating" status={`${v.checklistProgress}%`} />
            ))}
          </div>
        )}

        {tab === 'Timeline' && <Timeline entries={timeline.slice(0, 8)} />}

        {tab === 'Documents' && (
          <div className="space-y-2">
            {propertyDocs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No documents yet.</p>
            ) : (
              propertyDocs.map((d) => (
                <Link key={d.id} href={d.href} className="flex justify-between rounded-lg border px-3 py-3 text-sm">
                  <span>{d.title}</span>
                  <span className="text-primary text-xs">View</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </AgentShell>
  );
}

function TaskLink({
  href,
  title,
  status,
  approval,
}: {
  href: string;
  title: string;
  status: string;
  approval?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-primary mt-1 text-xs font-medium">{status}</p>
        {approval && (
          <p className="text-primary text-[10px] font-semibold uppercase">
            Action needed
          </p>
        )}
      </div>
      <span className="text-primary text-xs">Open</span>
    </Link>
  );
}
