'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

import { MaintenanceAgentWorkflowPanel } from '@/components/maintenance/maintenance-agent-workflow-panel';
import { PriorityBadge, ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import {
  buildWorkspaceCaseFromApi,
  buildWorkspaceCaseFromRequest,
} from '@/lib/maintenance-workspace/adapter';
import { useMaintenanceCaseLiveSync } from '@/lib/use-maintenance-case-live-sync';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import type { MaintenanceRequest, Priority, Property } from '@/lib/types';

function priorityForBadge(priority: Priority): string {
  return priority === 'urgent' || priority === 'high' ? 'urgent' : 'normal';
}

function mergeMaintenanceItem(
  item: MaintenanceRequest,
  liveMapped: MappedMaintenance | null,
): MaintenanceRequest {
  if (!liveMapped) return item;
  return {
    ...item,
    status: liveMapped.status,
    responsibility: liveMapped.responsibility,
    contractorName: liveMapped.contractorName,
    quoteAmount: liveMapped.quoteAmount,
    quoteExpiry: liveMapped.quoteExpiry,
    recommendation: liveMapped.recommendation,
    quoteDocumentUrl: liveMapped.quoteDocumentUrl,
    requiresApproval: liveMapped.requiresApproval,
    timeline: liveMapped.timeline,
    invitedContractorIds: liveMapped.invitedContractorIds,
    invitedContractors: liveMapped.apiRequest.invitedContractors,
  };
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

function MaintenanceJobHeader({
  item,
  syncing,
  workflowCtx,
}: {
  item: MaintenanceRequest;
  syncing?: boolean;
  workflowCtx: MaintenanceWorkflowContext;
}) {
  const resolvedResponsibility = resolveMaintenanceResponsibility(workflowCtx);

  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Job type">Maintenance</SummaryField>
        <SummaryField label="Urgency status">
          <PriorityBadge priority={priorityForBadge(item.priority)} />
        </SummaryField>
        <SummaryField label="Responsible party" className="sm:col-span-2">
          {!resolvedResponsibility || resolvedResponsibility === 'pending' ? (
            <span className="text-muted-foreground text-sm font-medium">Pending assignment</span>
          ) : (
            <ResponsibilityBadge responsibility={resolvedResponsibility} />
          )}
        </SummaryField>
      </dl>
      <p className="text-primary mt-3 text-xs font-semibold">
        {item.status}
        {syncing ? <span className="text-muted-foreground font-normal"> · Updating…</span> : null}
      </p>
    </div>
  );
}

export function PropertyMaintenanceJobPanel({
  item,
  property,
  propertyId: _propertyId,
}: {
  item: MaintenanceRequest;
  property: Property;
  propertyId: string;
}) {
  const { user } = useAuth();
  const { apiConnected, refresh } = useAgentData();
  const { workspaceCase, liveMapped, syncing, attachments, contractors, refresh: refreshCase } = useMaintenanceCaseLiveSync(
    item,
    property,
    apiConnected,
  );

  const displayItem = useMemo(
    () =>     mergeMaintenanceItem(item, liveMapped),
    [item, liveMapped],
  );

  const evidenceAttachmentCount = useMemo(
    () =>
      attachments.filter(
        (a) =>
          a.maintenanceRequestId === item.id &&
          (a.kind === 'initial_evidence' || a.kind === 'evidence'),
      ).length,
    [attachments, item.id],
  );

  const workflowCtx = useMemo(() => {
    const caseModel =
      liveMapped && workspaceCase
        ? buildWorkspaceCaseFromApi(liveMapped, property, user)
        : workspaceCase ?? buildWorkspaceCaseFromRequest(displayItem, property, user);

    return {
      item: displayItem,
      workspaceCase: caseModel,
      evidenceAttachmentCount,
    };
  }, [displayItem, evidenceAttachmentCount, liveMapped, property, user, workspaceCase]);

  const onCaseUpdated = useCallback(async () => {
    await refreshCase();
    await refresh();
  }, [refresh, refreshCase]);

  return (
    <div className="space-y-4">
      <MaintenanceJobHeader item={displayItem} syncing={syncing && apiConnected} workflowCtx={workflowCtx} />
      <MaintenanceAgentWorkflowPanel
        ctx={workflowCtx}
        property={property}
        attachments={attachments}
        contractors={contractors}
        onCaseUpdated={onCaseUpdated}
        apiConnected={apiConnected}
      />
    </div>
  );
}
