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
  const [agentDetail, setAgentDetail] = useState<MaintenanceCaseSnapshot['agentDetail']>(null);
  const [settledId, setSettledId] = useState<string | null>(null);
  const slaTickInFlightRef = useRef(false);
  const itemIdRef = useRef(item?.id);
  const requestSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const inFlightRef = useRef(0);
  const settledForRef = useRef<string | null>(null);
  const loadedForRef = useRef<string | null>(null);
  itemIdRef.current = item?.id;

  const fallbackCase = item
    ? buildWorkspaceCaseFromRequest(item, property, user)
    : null;

  const sync = useCallback(async () => {
    if (!apiConnected || !item) return;
    const caseId = item.id;
    const seq = ++requestSeqRef.current;
    inFlightRef.current += 1;
    setSyncing(true);
    try {
      const snapshot = await fetchMaintenanceCase(caseId, item.propertyId);
      if (itemIdRef.current !== caseId || !snapshot || seq < appliedSeqRef.current) return;
      appliedSeqRef.current = seq;
      settledForRef.current = caseId;
      setLiveMapped(snapshot.mapped);
      setRemindersSent(snapshot.remindersSent);
      setNextReminderDueAt(snapshot.nextReminderDueAt);
      setMaintenanceReminders(snapshot.maintenanceReminders);
      setWorkflowRequest(snapshot.workflowRequest);
      setQuotations(snapshot.quotations);
      setAttachments(snapshot.attachments);
      setContractors(snapshot.contractors ?? []);
      setAgentDetail(snapshot.agentDetail);
      setWorkspaceCase(buildWorkspaceCaseFromApi(snapshot.mapped, property, user));
      setSettledId(caseId);
    } catch {
      // A failed attempt must not discard a snapshot that is still in flight.
    } finally {
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      if (itemIdRef.current !== caseId) return;
      setSyncing(inFlightRef.current > 0);
      if (inFlightRef.current === 0 && settledForRef.current !== caseId) {
        settledForRef.current = caseId;
        setSettledId(caseId);
      }
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
      loadedForRef.current = null;
      settledForRef.current = null;
      setWorkspaceCase(null);
      setLiveMapped(null);
      setAttachments([]);
      setContractors([]);
      setMaintenanceReminders([]);
      setWorkflowRequest(null);
      setQuotations([]);
      setAgentDetail(null);
      setSettledId(null);
      return;
    }
    if (loadedForRef.current !== item.id) {
      loadedForRef.current = item.id;
      settledForRef.current = null;
      setWorkspaceCase(null);
      setLiveMapped(null);
      setAttachments([]);
      setContractors([]);
      setMaintenanceReminders([]);
      setWorkflowRequest(null);
      setQuotations([]);
      setAgentDetail(null);
      setSettledId(null);
    }
    if (!apiConnected) {
      setWorkspaceCase(buildWorkspaceCaseFromRequest(item, property, user));
      setLiveMapped(null);
      setAttachments([]);
      setContractors([]);
      setMaintenanceReminders([]);
      setWorkflowRequest(null);
      setQuotations([]);
      setAgentDetail(null);
      settledForRef.current = item.id;
      setSettledId(item.id);
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

  const waitingForLive = apiConnected && item != null && settledId !== item.id;

  return {
    workspaceCase: waitingForLive ? null : (workspaceCase ?? fallbackCase),
    liveMapped,
    remindersSent,
    nextReminderDueAt,
    maintenanceReminders,
    workflowRequest,
    quotations,
    attachments,
    contractors,
    agentDetail,
    syncing: syncing && apiConnected,
    refresh: sync,
  };
}
