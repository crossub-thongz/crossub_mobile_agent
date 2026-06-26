'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { MaintenanceWorkspace } from '@/components/maintenance-workspace/maintenance-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import {
  buildWorkspaceCaseFromApi,
  buildWorkspaceCaseFromDemo,
} from '@/lib/maintenance-workspace/adapter';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const {
    maintenanceAll,
    maintenanceFromApi,
    properties,
    approveMaintenanceQuote,
    declineMaintenanceQuote,
    refresh,
  } = useAgentData();

  const item = maintenanceAll.find((m) => m.id === id);
  const apiItem = maintenanceFromApi.find((m) => m.id === id) as MappedMaintenance | undefined;
  const back = useBackNavigation(ROUTES.MAINTENANCE, 'Maintenance');

  const property = useMemo(
    () => properties.find((p) => p.id === item?.propertyId),
    [properties, item?.propertyId],
  );

  const workspaceCase = useMemo(() => {
    if (!item) return null;
    if (apiItem?.apiRequest) {
      return buildWorkspaceCaseFromApi(apiItem, property, user);
    }
    return buildWorkspaceCaseFromDemo(item, property, user);
  }, [apiItem, item, property, user]);

  if (!item || !workspaceCase) notFound();

  const handleApprove = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('No submitted quotation on API — demo action only');
      return;
    }
    try {
      await approveMaintenanceQuote(apiItem.submittedQuotationId);
      toast.success('Quote approved via crossub_web API');
      await refresh();
    } catch {
      toast.error('Approval failed — check API connection');
    }
  };

  const handleDecline = async (reason: string) => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('Demo only — connect API for live decline');
      return;
    }
    try {
      await declineMaintenanceQuote(apiItem.submittedQuotationId, reason);
      toast.success('Quote declined — requote workflow started');
      await refresh();
    } catch {
      toast.error('Decline failed');
    }
  };

  return (
    <AgentShell
      wide
      immersive
      backHref={back.href}
      backLabel={back.label}
      hideGlobalFabs
      hideNeedAction
    >
      <MaintenanceWorkspace
        workspaceCase={workspaceCase}
        backHref={back.href}
        backLabel={back.label}
        onApproveQuote={handleApprove}
        onDeclineQuote={handleDecline}
        quoteAmount={item.quoteAmount}
        contractorName={item.contractorName}
        quoteExpiry={item.quoteExpiry}
        recommendation={item.recommendation}
        quoteDocumentUrl={item.quoteDocumentUrl}
        requiresApproval={item.requiresApproval}
      />
    </AgentShell>
  );
}
