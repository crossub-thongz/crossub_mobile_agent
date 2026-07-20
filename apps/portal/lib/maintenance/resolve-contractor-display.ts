import type { ApiQuotation } from '@/lib/crossub-api/types';
import type { MaintenanceContractorSuggestion } from '@/lib/crossub-api/maintenance-client';
import { maintenanceContractorSelectionKey } from '@/lib/maintenance/maintenance-contractor-key';

export function contractorIdsMatch(a: string, b: string): boolean {
  const norm = (id: string) => id.replace(/^agency-pref-/, '');
  if (a === b) return true;
  if (a === `agency-pref-${b}` || b === `agency-pref-${a}`) return true;
  return norm(a) === norm(b);
}

/** Pair RFQ audit copy with invited ids when names are stored without contractor ids. */
export function resolveInvitedContractorNameFromAudit(
  contractorId: string,
  auditEntries?: Array<{ action: string; message: string }>,
  invitedContractorIds?: string[],
): string | undefined {
  if (!auditEntries?.length || !invitedContractorIds?.length) return undefined;

  const rfqNames: string[] = [];
  for (const entry of auditEntries) {
    if (entry.action !== 'contractor_assigned') continue;
    const match = entry.message.match(/RFQ sent to (.+?) for quote review/i);
    if (match?.[1]) rfqNames.push(match[1].trim());
  }
  if (rfqNames.length === 0) return undefined;

  // Audit is newest-first; invites are oldest-first.
  rfqNames.reverse();
  const index = invitedContractorIds.findIndex((id) => contractorIdsMatch(id, contractorId));
  if (index < 0 || index >= rfqNames.length) return undefined;
  return rfqNames[index];
}

export function resolveContractorDisplayName(
  contractorId: string,
  args: {
    contractors?: Array<{ id: string; name: string }>;
    suggestions?: MaintenanceContractorSuggestion[];
    invitedContractors?: Array<{ id: string; name: string }>;
    assignedContractorId?: string;
    assignedContractorName?: string;
    /** @deprecated Prefer assignedContractorId + assignedContractorName */
    fallbackName?: string;
    auditEntries?: Array<{ action: string; message: string }>;
    invitedContractorIds?: string[];
  },
): string {
  const snapshot = args.invitedContractors?.find((row) =>
    contractorIdsMatch(row.id, contractorId),
  );
  if (snapshot?.name && snapshot.name !== snapshot.id) return snapshot.name;

  const suggestion = args.suggestions?.find(
    (row) =>
      contractorIdsMatch(maintenanceContractorSelectionKey(row), contractorId) ||
      contractorIdsMatch(row.id, contractorId) ||
      (row.contractorId ? contractorIdsMatch(row.contractorId, contractorId) : false),
  );
  if (suggestion?.name) return suggestion.name;

  const contractor = args.contractors?.find((row) => contractorIdsMatch(row.id, contractorId));
  if (contractor?.name) return contractor.name;

  const assignedName =
    args.assignedContractorName ??
    (args.assignedContractorId &&
    contractorIdsMatch(args.assignedContractorId, contractorId)
      ? args.fallbackName
      : undefined);
  if (assignedName) return assignedName;

  const fromAudit = resolveInvitedContractorNameFromAudit(
    contractorId,
    args.auditEntries,
    args.invitedContractorIds,
  );
  if (fromAudit) return fromAudit;

  return snapshot?.name ?? contractorId;
}

export function latestSubmittedQuoteForContractor(
  quotations: ApiQuotation[],
  requestId: string,
  contractorId: string,
): ApiQuotation | undefined {
  const matches = quotations
    .filter(
      (quote) =>
        quote.maintenanceRequestId === requestId &&
        contractorIdsMatch(quote.contractorId, contractorId),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  // Prefer live submitted quotes; fall back to approved so post-approve
  // "Send quotation to landlord" still has a quote row to bind to.
  return (
    matches.find((quote) => quote.status === 'submitted') ??
    matches.find((quote) => quote.status === 'approved') ??
    matches[0]
  );
}
