/** Modules that show inner green glow on new cases in the agent portal until opened. */
export type AgentWorkflowCaseModule =
  | 'maintenance'
  | 'inspection'
  | 'rent_review'
  | 'leasing'
  | 'end_leasing';

const SNAPSHOT_PREFIX = 'crossub:agent-portal:workflow-case-snapshot:v1';
const SEEN_PREFIX = 'crossub:agent-portal:workflow-case-seen:v1';

function snapshotStorageKey(module: AgentWorkflowCaseModule): string {
  return `${SNAPSHOT_PREFIX}:${module}`;
}

function seenStorageKey(module: AgentWorkflowCaseModule, caseId: string): string {
  return `${SEEN_PREFIX}:${module}:${caseId}`;
}

function loadSnapshot(module: AgentWorkflowCaseModule): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(snapshotStorageKey(module));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function saveSnapshot(module: AgentWorkflowCaseModule, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(snapshotStorageKey(module), JSON.stringify([...ids]));
}

export function leasingWorkflowCaseId(propertyId: string, cycleId?: string | null): string {
  return cycleId ? `${propertyId}::${cycleId}` : propertyId;
}

export function isWorkflowCaseSeen(module: AgentWorkflowCaseModule, caseId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(seenStorageKey(module, caseId)) === '1';
}

export function seedWorkflowCaseSnapshot(
  module: AgentWorkflowCaseModule,
  caseIds: string[],
): void {
  if (typeof window === 'undefined') return;
  const snapshot = loadSnapshot(module);
  if (snapshot.size > 0) return;
  if (caseIds.length === 0) return;
  saveSnapshot(module, new Set(caseIds));
}

export function isWorkflowCaseNew(module: AgentWorkflowCaseModule, caseId: string): boolean {
  if (isWorkflowCaseSeen(module, caseId)) return false;
  const snapshot = loadSnapshot(module);
  if (snapshot.size === 0) return false;
  return !snapshot.has(caseId);
}

export function markWorkflowCaseOpened(module: AgentWorkflowCaseModule, caseId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(seenStorageKey(module, caseId), '1');
  const snapshot = loadSnapshot(module);
  snapshot.add(caseId);
  saveSnapshot(module, snapshot);
}
