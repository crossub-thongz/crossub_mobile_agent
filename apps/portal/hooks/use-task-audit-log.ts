'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  fetchAgentTaskAuditLog,
  type AgentTaskAuditLogEntry,
  type AgentTaskKind,
} from '@/lib/crossub-api/agent-workflow-client';

export function useTaskAuditLog(kind: AgentTaskKind, taskId: string | undefined) {
  const [entries, setEntries] = useState<AgentTaskAuditLogEntry[]>([]);

  const reload = useCallback(async () => {
    if (!taskId) {
      setEntries([]);
      return;
    }
    try {
      const next = await fetchAgentTaskAuditLog(kind, taskId);
      setEntries(next.entries);
    } catch {
      setEntries([]);
    }
  }, [kind, taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { entries, reload };
}

export function mergeTaskAuditIntoActivity<
  T extends { id: string; at: string; title: string },
>(
  domain: T[],
  audit: AgentTaskAuditLogEntry[],
  mapEntry: (entry: AgentTaskAuditLogEntry) => T,
): T[] {
  const mapped = audit.map(mapEntry);
  const seen = new Set(mapped.map((entry) => entry.id));
  return [...mapped, ...domain.filter((entry) => !seen.has(entry.id))].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
}
