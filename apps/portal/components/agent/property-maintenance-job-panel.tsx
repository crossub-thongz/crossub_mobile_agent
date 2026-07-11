'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';

import { MaintenanceAgentWorkflowPanel } from '@/components/maintenance/maintenance-agent-workflow-panel';
import { PriorityBadge, ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { maintenanceDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { buildWorkspaceCaseFromRequest } from '@/lib/maintenance-workspace/adapter';
import type { MaintenanceRequest, Priority, Property } from '@/lib/types';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

function maintenanceOrderNumber(item: MaintenanceRequest): string {
  return item.trackingNumber || workflowCaseReferenceLabel(item.id, 'maintenance');
}

function priorityForBadge(priority: Priority): string {
  switch (priority) {
    case 'urgent':
      return 'critical';
    case 'high':
      return 'high';
    case 'normal':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

function SummaryField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug">{children}</dd>
    </div>
  );
}

function MaintenanceJobHeader({ item }: { item: MaintenanceRequest }) {
  const orderNumber = maintenanceOrderNumber(item);
  const jobDescription = item.description?.trim() || item.title;
  const issueType =
    item.title?.trim() && item.title.trim() !== jobDescription ? item.title.trim() : null;

  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Job type">Maintenance</SummaryField>
        <SummaryField label="Order number">
          <span className="text-primary tabular-nums">{orderNumber}</span>
        </SummaryField>
        <SummaryField label="Urgency status">
          <PriorityBadge priority={priorityForBadge(item.priority)} />
        </SummaryField>
        <SummaryField label="Responsible party">
          {item.responsibility === 'pending' ? (
            <span className="text-muted-foreground text-sm font-medium">Pending assignment</span>
          ) : (
            <ResponsibilityBadge responsibility={item.responsibility} />
          )}
        </SummaryField>
        <SummaryField label="Job description" className="sm:col-span-2">
          <div className="space-y-1">
            {issueType ? (
              <p className="text-foreground text-sm font-semibold">{issueType}</p>
            ) : null}
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-normal">
              {jobDescription}
            </p>
          </div>
        </SummaryField>
      </dl>
      <p className="text-primary mt-3 text-xs font-semibold">{item.status}</p>
    </div>
  );
}

export function PropertyMaintenanceJobPanel({
  item,
  property,
  propertyId,
}: {
  item: MaintenanceRequest;
  property: Property;
  propertyId: string;
}) {
  const { user } = useAuth();
  const workflowCtx = useMemo(
    () => ({
      item,
      workspaceCase: buildWorkspaceCaseFromRequest(item, property, user),
    }),
    [item, property, user],
  );

  return (
    <div className="space-y-4">
      <MaintenanceJobHeader item={item} />

      <MaintenanceAgentWorkflowPanel ctx={workflowCtx} />

      <Button
        asChild
        size="lg"
        variant="outline"
        className="border-primary/35 bg-primary/5 hover:bg-primary/10 h-11 w-full gap-2 text-sm font-semibold"
      >
        <Link href={maintenanceDetail(item.id, fromProperty(propertyId, 'Maintenance'))}>
          Open full maintenance workspace
          <ExternalLink className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
