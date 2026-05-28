'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';

import { PropertyChatFab } from '@/components/agent/property-chat-fab';
import { StatusBanner } from '@/components/agent/status-banner';
import { TaskStatusRow } from '@/components/agent/task-status-row';
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
      <div className="space-y-4 pb-8">
        <StatusBanner
          status={property.leaseStatus}
          subtitle={`${property.homeOwnerName} · ${property.tenantName}`}
        />

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
              <TaskStatusRow
                key={m.id}
                item={{
                  id: m.id,
                  propertyAddress: m.propertyAddress,
                  taskLabel: m.title,
                  status: m.status,
                  href: maintenanceDetail(m.id),
                  module: 'Maintenance',
                  tone: m.requiresApproval ? 'warning' : 'neutral',
                  requiresApproval: m.requiresApproval,
                }}
              />
            ))}
            {tasks.inspections.map((i) => (
              <TaskStatusRow
                key={i.id}
                item={{
                  id: i.id,
                  propertyAddress: i.propertyAddress,
                  taskLabel: `${i.type} inspection`,
                  status: i.status,
                  href: inspectionDetail(i.id),
                  module: 'Inspection',
                  tone: 'neutral',
                }}
              />
            ))}
            {tasks.rentReviews.map((r) => (
              <TaskStatusRow
                key={r.id}
                item={{
                  id: r.id,
                  propertyAddress: r.propertyAddress,
                  taskLabel: 'Rent review',
                  status: r.status,
                  href: rentReviewDetail(r.id),
                  module: 'Rent review',
                  tone: r.requiresApproval ? 'warning' : 'ok',
                  requiresApproval: r.requiresApproval,
                }}
              />
            ))}
            {tasks.vacating.map((v) => (
              <TaskStatusRow
                key={v.id}
                item={{
                  id: v.id,
                  propertyAddress: v.propertyAddress,
                  taskLabel: 'Vacating',
                  status: `${v.checklistProgress}% complete`,
                  href: vacatingDetail(v.id),
                  module: 'Vacating',
                  tone: v.requiresApproval ? 'warning' : 'neutral',
                  requiresApproval: v.requiresApproval,
                }}
              />
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
      <PropertyChatFab propertyId={property.id} />
    </AgentShell>
  );
}
