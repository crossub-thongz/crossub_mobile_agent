/**
 * Termination request reasons for the agent lodge form.
 * The Reason API is keyed by jurisdiction. Only AU-NSW is active; the form
 * does not ask the agent to pick a state or country.
 */
export const TERMINATION_REQUEST_JURISDICTION = 'AU-NSW';

/** Stamped by the agent lodge form. The agent cannot choose an account manager. */
export const TERMINATION_REQUEST_SOURCE_AGENT = 'AGENT_REQUEST';

export type TerminationReasonOption = {
  code: string;
  label: string;
};

/** UI label on the left, backend code on the right. NSW only. */
export const NSW_TERMINATION_REASONS: readonly TerminationReasonOption[] = [
  { code: 'RENT_ARREARS', label: 'Rent Arrears' },
  { code: 'UNPAID_CHARGES', label: 'Unpaid Water / Utilities' },
  { code: 'LEASE_BREACH', label: 'Breach of Agreement' },
  { code: 'OWNER_OCCUPATION', label: 'Owner / Family Moving In' },
  { code: 'PROPOSED_SALE', label: 'Proposed Sale' },
  { code: 'PROPERTY_SOLD', label: 'Property Sold' },
  { code: 'MAJOR_RENOVATION', label: 'Renovation / Repairs' },
  { code: 'DEMOLITION', label: 'Demolition' },
  { code: 'CHANGE_OF_USE', label: 'Change of Property Use' },
];

export function terminationReasonLabel(code: string, reasons: readonly TerminationReasonOption[] = NSW_TERMINATION_REASONS): string | undefined {
  return reasons.find((reason) => reason.code === code)?.label;
}
