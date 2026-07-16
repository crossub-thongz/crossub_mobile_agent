/** Canonical workflow-board key for an agency-preferred contractor row. */
export function maintenanceContractorSelectionKey(row: {
  id: string;
  contractorId?: string | null;
}): string {
  return row.contractorId?.trim() || `agency-pref-${row.id}`;
}
