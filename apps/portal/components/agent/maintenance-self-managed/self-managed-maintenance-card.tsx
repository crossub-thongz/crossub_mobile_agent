'use client';

import { useCallback } from 'react';

import { SelfManagedMaintenancePanel } from '@/components/agent/maintenance-self-managed/self-managed-maintenance-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import { useIsPropertySelfManaged } from '@/hooks/use-self-managed-access';
import { cn } from '@/lib/utils';

/**
 * The Self-Manage job actions on the full maintenance page, so editing, inviting tradies and
 * approving quotes are not only in the Maintenance list's side pane. Renders nothing off Self-Manage.
 */
export function SelfManagedMaintenanceCard({
  requestId,
  propertyId,
  onCaseUpdated,
  className,
}: {
  requestId: string;
  propertyId: string;
  onCaseUpdated?: () => Promise<void>;
  className?: string;
}) {
  const selfManaged = useIsPropertySelfManaged(propertyId);
  const { properties, refresh } = useAgentData();
  const agencyId = properties.find((p) => p.id === propertyId)?.agencyId ?? null;
  const onChanged = useCallback(() => {
    if (onCaseUpdated) {
      void onCaseUpdated();
      return;
    }
    void refresh({ force: true });
  }, [onCaseUpdated, refresh]);

  if (!selfManaged) return null;
  return (
    <SelfManagedMaintenancePanel
      key={requestId}
      requestId={requestId}
      agencyId={agencyId}
      onChanged={onChanged}
      heading={<h3 className="text-sm font-semibold">{COPY.sectionTitle}</h3>}
      className={cn('rounded-2xl border v2-frosted-surface p-5', className)}
    />
  );
}
