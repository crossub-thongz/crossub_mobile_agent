import type { ApiMaintenanceAuditLogEntry, ApiQuotation } from '@/lib/crossub-api/types';

import { contractorIdsMatch } from '@/lib/maintenance/resolve-contractor-display';

function inferInvitedContractorIdsFromAudit(
  entries: Array<{ action: string; message: string }>,
): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (entry.action !== 'contractor_assigned') continue;
    const namedMatch = entry.message.match(/RFQ sent to .+? \(([^)]+)\) for quote review/i);
    const legacyMatch = entry.message.match(/contractor\s+(\S+)\s+for quote review/i);
    const contractorId = namedMatch?.[1] ?? legacyMatch?.[1];
    if (!contractorId) continue;
    if (!ids.some((existing) => existing === contractorId)) ids.push(contractorId);
  }
  return ids;
}

export function unionInvitedContractorIds(
  ...lists: Array<string[] | undefined>
): string[] | undefined {
  const merged = lists.flatMap((list) => list ?? []).filter(Boolean);
  if (merged.length === 0) return undefined;
  const unique: string[] = [];
  for (const id of merged) {
    if (!unique.some((existing) => contractorIdsMatch(existing, id))) {
      unique.push(id);
    }
  }
  return unique.length > 0 ? unique : undefined;
}

function unionInvitedContractorSnapshots(
  ...lists: Array<Array<{ id: string; name: string }> | undefined>
): Array<{ id: string; name: string }> | undefined {
  const merged = lists.flatMap((list) => list ?? []);
  if (merged.length === 0) return undefined;
  const unique: Array<{ id: string; name: string }> = [];
  for (const entry of merged) {
    const hit = unique.find((existing) => contractorIdsMatch(existing.id, entry.id));
    if (hit) {
      if (hit.name === hit.id && entry.name !== entry.id) hit.name = entry.name;
      continue;
    }
    unique.push(entry);
  }
  return unique.length > 0 ? unique : undefined;
}

/** Contractors in scope for RFQ quote review — aligned with the admin portal. */
export function resolveRfqContractorIds(args: {
  requestId: string;
  invitedContractors?: Array<{ id: string; name: string }>;
  invitedContractorIds?: string[];
  quotations?: ApiQuotation[];
  auditEntries?: ApiMaintenanceAuditLogEntry[];
  pendingContractorIds?: string[];
  assignedContractorId?: string;
}): string[] {
  const fromSnapshot = args.invitedContractors?.map((row) => row.id) ?? [];
  const fromInvite = args.invitedContractorIds ?? [];
  const explicitInvites = unionInvitedContractorIds(fromSnapshot, fromInvite) ?? [];

  const fromQuotations =
    args.quotations
      ?.filter((q) => q.maintenanceRequestId === args.requestId)
      .map((q) => q.contractorId) ?? [];

  // Agent RFQ selection is authoritative — do not add stale assigned ids or audit
  // history once explicit invites exist (matches admin maintenance-engine).
  if (explicitInvites.length > 0) {
    return unionInvitedContractorIds(explicitInvites, fromQuotations) ?? explicitInvites;
  }

  const fromPending = unionInvitedContractorIds(
    args.pendingContractorIds,
    args.assignedContractorId ? [args.assignedContractorId] : undefined,
  );
  if (fromPending?.length) {
    return unionInvitedContractorIds(fromPending, fromQuotations) ?? fromPending;
  }

  const fromAudit = args.auditEntries?.length
    ? inferInvitedContractorIdsFromAudit(args.auditEntries)
    : [];
  if (fromAudit.length > 0) {
    return unionInvitedContractorIds(fromAudit, fromQuotations) ?? fromAudit;
  }

  return fromQuotations.length > 0 ? [...new Set(fromQuotations)] : [];
}

export { unionInvitedContractorSnapshots };
