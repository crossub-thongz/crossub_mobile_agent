import type { ApiQuotation } from '@/lib/crossub-api/types';
import type { MaintenanceContractorSuggestion } from '@/lib/crossub-api/maintenance-client';
import { maintenanceContractorSelectionKey } from '@/lib/maintenance/maintenance-contractor-key';

export function contractorIdsMatch(a: string, b: string): boolean {
  const norm = (id: string) => id.replace(/^agency-pref-/, '');
  if (a === b) return true;
  if (a === `agency-pref-${b}` || b === `agency-pref-${a}`) return true;
  return norm(a) === norm(b);
}

export function resolveContractorDisplayName(
  contractorId: string,
  args: {
    contractors?: Array<{ id: string; name: string }>;
    suggestions?: MaintenanceContractorSuggestion[];
    invitedContractors?: Array<{ id: string; name: string }>;
    fallbackName?: string;
  },
): string {
  const snapshot = args.invitedContractors?.find((row) =>
    contractorIdsMatch(row.id, contractorId),
  );
  if (snapshot?.name && snapshot.name !== snapshot.id) return snapshot.name;

  const suggestion = args.suggestions?.find(
    (row) =>
      contractorIdsMatch(maintenanceContractorSelectionKey(row), contractorId) ||
      contractorIdsMatch(row.id, contractorId),
  );
  if (suggestion?.name) return suggestion.name;

  const contractor = args.contractors?.find((row) => contractorIdsMatch(row.id, contractorId));
  if (contractor?.name) return contractor.name;

  if (args.fallbackName) return args.fallbackName;

  return snapshot?.name ?? contractorId;
}

export function latestSubmittedQuoteForContractor(
  quotations: ApiQuotation[],
  requestId: string,
  contractorId: string,
): ApiQuotation | undefined {
  return quotations
    .filter(
      (quote) =>
        quote.maintenanceRequestId === requestId &&
        contractorIdsMatch(quote.contractorId, contractorId) &&
        quote.status === 'submitted',
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
}
