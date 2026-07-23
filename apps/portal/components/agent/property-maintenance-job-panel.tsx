'use client';

import { useCallback, useMemo } from 'react';

import { MaintenanceAgentWorkflowPanel } from '@/components/maintenance/maintenance-agent-workflow-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import {
  buildWorkspaceCaseFromApi,
  buildWorkspaceCaseFromRequest,
} from '@/lib/maintenance-workspace/adapter';
import { useMaintenanceCaseLiveSync } from '@/lib/use-maintenance-case-live-sync';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import type { MaintenanceRequest, Property } from '@/lib/types';

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
    scheduleStepStartedAt: liveMapped.scheduleStepStartedAt,
    scheduleProposal: liveMapped.scheduleProposal,
    scheduleEscalated: liveMapped.scheduleEscalated,
  };
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
  const { workspaceCase, liveMapped, syncing, attachments, contractors, refresh: refreshCase, maintenanceReminders, workflowRequest, quotations } = useMaintenanceCaseLiveSync(
    item,
    property,
    apiConnected,
  );

  const displayItem = useMemo(
    () => mergeMaintenanceItem(item, liveMapped),
    [item, liveMapped],
  );

  const evidenceAttachmentCount = useMemo(
    () =>
      attachments.filter(
        (a) => a.maintenanceRequestId === item.id && a.kind === 'initial_evidence',
      ).length,
    [attachments, item.id],
  );

  const workflowCtx = useMemo((): MaintenanceWorkflowContext => {
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
    <MaintenanceAgentWorkflowPanel
      ctx={workflowCtx}
      item={displayItem}
      property={property}
      attachments={attachments}
      contractors={contractors}
      onCaseUpdated={onCaseUpdated}
      apiConnected={apiConnected}
      syncing={syncing && apiConnected}
      maintenanceReminders={maintenanceReminders}
      workflowRequest={workflowRequest}
      quotations={quotations}
    />
  );
}
