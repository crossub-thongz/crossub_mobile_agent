import { api } from '@/lib/api';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';

const BASE = '/leasing/cycles';

const inflight = new Map<string, Promise<ServerLeasingCycleView>>();

async function fetchOnce(cycleId: string): Promise<ServerLeasingCycleView> {
  const { cycle } = await api.get<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}`);
  return cycle;
}

/** Coalesce concurrent reads for the same cycle id (live sync + overview + workflow). */
export function fetchLeasingCycleView(cycleId: string): Promise<ServerLeasingCycleView> {
  const pending = inflight.get(cycleId);
  if (pending) return pending;

  const promise = fetchOnce(cycleId).finally(() => {
    inflight.delete(cycleId);
  });
  inflight.set(cycleId, promise);
  return promise;
}

/** Drop any in-flight read after a mutation so the next fetch sees fresh server state. */
export function invalidateLeasingCycleView(cycleId: string): void {
  inflight.delete(cycleId);
}
