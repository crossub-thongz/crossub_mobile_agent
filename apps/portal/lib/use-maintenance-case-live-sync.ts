'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import type { MaintenanceRequest, Property } from '@/lib/types';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import { fetchMaintenanceCase } from '@/lib/maintenance/fetch-maintenance-case';
import { buildWorkspaceCaseFromApi, buildWorkspaceCaseFromRequest } from '@/lib/maintenance-workspace/adapter';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { useLivePoll } from '@/lib/use-live-poll';

export function useMaintenanceCaseLiveSync(
  item: MaintenanceRequest | undefined,
  property: Property | undefined,
  apiConnected: boolean,
) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [liveMapped, setLiveMapped] = useState<MappedMaintenance | null>(null);
  const [remindersSent, setRemindersSent] = useState(0);
  const [nextReminderDueAt, setNextReminderDueAt] = useState<string | null>(null);
  const [workspaceCase, setWorkspaceCase] = useState<MaintenanceWorkspaceCase | null>(null);

  const fallbackCase = item
    ? buildWorkspaceCaseFromRequest(item, property, user)
    : null;

  const sync = useCallback(async () => {
    if (!apiConnected || !item) return;
    setSyncing(true);
    try {
      const snapshot = await fetchMaintenanceCase(item.id, item.propertyId);
      if (!snapshot) return;
      setLiveMapped(snapshot.mapped);
      setRemindersSent(snapshot.remindersSent);
      setNextReminderDueAt(snapshot.nextReminderDueAt);
      setWorkspaceCase(buildWorkspaceCaseFromApi(snapshot.mapped, property, user));
    } catch {
      // keep last good snapshot
    } finally {
      setSyncing(false);
    }
  }, [apiConnected, item, property, user]);

  useEffect(() => {
    if (!item) {
      setWorkspaceCase(null);
      setLiveMapped(null);
      return;
    }
    if (!apiConnected) {
      setWorkspaceCase(buildWorkspaceCaseFromRequest(item, property, user));
      setLiveMapped(null);
      return;
    }
    void sync();
  }, [apiConnected, item, property, user, sync]);

  useLivePoll(sync, apiConnected && Boolean(item));

  return {
    workspaceCase: workspaceCase ?? fallbackCase,
    liveMapped,
    remindersSent,
    nextReminderDueAt,
    syncing: syncing && apiConnected,
    refresh: sync,
  };
}
