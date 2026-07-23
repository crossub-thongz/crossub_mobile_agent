'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import { runMaintenanceSlaTick } from '@/lib/crossub-api/maintenance-client';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import {
  fetchMaintenanceCase,
  type MaintenanceCaseSnapshot,
} from '@/lib/maintenance/fetch-maintenance-case';
import { buildWorkspaceCaseFromApi, buildWorkspaceCaseFromRequest } from '@/lib/maintenance-workspace/adapter';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import type { MaintenanceRequest, Property } from '@/lib/types';
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
  const [maintenanceReminders, setMaintenanceReminders] = useState<
    MaintenanceCaseSnapshot['maintenanceReminders']
  >([]);
  const [workflowRequest, setWorkflowRequest] = useState<
    MaintenanceCaseSnapshot['workflowRequest']
  >(null);
  const [quotations, setQuotations] = useState<MaintenanceCaseSnapshot['quotations']>([]);
  const [workspaceCase, setWorkspaceCase] = useState<MaintenanceWorkspaceCase | null>(null);
  const [attachments, setAttachments] = useState<ApiMaintenanceAttachment[]>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string }>>([]);
  const slaTickInFlightRef = useRef(false);

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
      setMaintenanceReminders(snapshot.maintenanceReminders);
      setWorkflowRequest(snapshot.workflowRequest);
      setQuotations(snapshot.quotations);
      setAttachments(snapshot.attachments);
      setContractors(snapshot.contractors ?? []);
      setWorkspaceCase(buildWorkspaceCaseFromApi(snapshot.mapped, property, user));
    } catch {
      // keep last good snapshot
    } finally {
      setSyncing(false);
    }
  }, [apiConnected, item, property, user]);

  const runSlaTick = useCallback(async () => {
    if (!apiConnected || !item || slaTickInFlightRef.current) return;
    slaTickInFlightRef.current = true;
    try {
      await runMaintenanceSlaTick();
      await sync();
    } catch {
      // keep last good snapshot
    } finally {
      slaTickInFlightRef.current = false;
    }
  }, [apiConnected, item, sync]);

  useEffect(() => {
    if (!item) {
      setWorkspaceCase(null);
      setLiveMapped(null);
      setAttachments([]);
      setContractors([]);
      setMaintenanceReminders([]);
      setWorkflowRequest(null);
      setQuotations([]);
      return;
    }
    if (!apiConnected) {
      setWorkspaceCase(buildWorkspaceCaseFromRequest(item, property, user));
      setLiveMapped(null);
      setAttachments([]);
      setContractors([]);
      setMaintenanceReminders([]);
      setWorkflowRequest(null);
      setQuotations([]);
      return;
    }
    void sync();
  }, [apiConnected, item, property, user, sync]);

  useLivePoll(sync, apiConnected && Boolean(item));

  useEffect(() => {
    if (!apiConnected || !item) return;
    void runSlaTick();
    const id = window.setInterval(() => {
      void runSlaTick();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [apiConnected, item, runSlaTick]);

  return {
    workspaceCase: workspaceCase ?? fallbackCase,
    liveMapped,
    remindersSent,
    nextReminderDueAt,
    maintenanceReminders,
    workflowRequest,
    quotations,
    attachments,
    contractors,
    syncing: syncing && apiConnected,
    refresh: sync,
  };
}
