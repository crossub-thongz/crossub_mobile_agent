export const ACCOUNTING_SECTIONS = [
  { id: 'rent_reconciliation', label: 'Rent reconciliation' },
  { id: 'invoices', label: 'Invoice management' },
  { id: 'arrears', label: 'Rent & invoice arrears' },
  { id: 'statements', label: 'Statement' },
  { id: 'settings', label: 'Settings' },
] as const;

/**
 * Flip when the full accounting module ships. Until then v2 keeps arrears /
 * rent chasing on the property hub, hides the Arrears sidebar item for every
 * agent, and hides rent reconciliation, invoices, and statements.
 */
export const ACCOUNTING_MODULE_LAUNCHED = false;

export type AccountingSectionId = (typeof ACCOUNTING_SECTIONS)[number]['id'];

export function parseAccountingSection(
  value: string | null,
  legacy?: { tab?: string | null; filter?: string | null },
): AccountingSectionId {
  const match = ACCOUNTING_SECTIONS.find((s) => s.id === value);
  if (match) return match.id;
  if (legacy?.tab === 'invoices') return 'invoices';
  if (legacy?.filter === 'arrears') return 'arrears';
  return 'rent_reconciliation';
}

export const ACCOUNTING_SECTION_DESCRIPTION: Record<AccountingSectionId, string> = {
  rent_reconciliation:
    'Rent received and outstanding balances across your portfolio. Open a property to review ledger entries.',
  invoices: 'Create and manage Crossub management fee tax invoices.',
  arrears:
    'Properties with outstanding rent or invoice arrears and collection activity.',
  statements:
    'Owner settlement statements by property. Open a property to view or download.',
  settings:
    'Receipt templates, rent reminder schedules, and bank feed connection.',
};
