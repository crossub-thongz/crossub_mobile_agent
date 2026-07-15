export const PROPERTY_HISTORY_SCOPE_FILTERS = [
  { id: 'completed', label: 'Completed' },
  { id: 'deleted', label: 'Deleted' },
] as const;

export type PropertyHistoryScope = (typeof PROPERTY_HISTORY_SCOPE_FILTERS)[number]['id'];

export const LEASING_HISTORY_CATEGORY_FILTERS = [
  { id: 'new_leasing', label: 'New leasing' },
  { id: 'end_leasing', label: 'End leasing' },
] as const;

export type LeasingHistoryCategory = (typeof LEASING_HISTORY_CATEGORY_FILTERS)[number]['id'];
