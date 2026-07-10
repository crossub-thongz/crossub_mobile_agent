/** Room list mirrored from the inspector mobile app (`INGOING_AREAS`). */
export const OUTGOING_COMPARISON_AREAS = [
  'Entry',
  'Living Room',
  'Kitchen',
  'Laundry',
  'Bedroom',
  'Bathroom',
  'Balcony',
  'Garage',
] as const;

export type OutgoingComparisonArea = (typeof OUTGOING_COMPARISON_AREAS)[number];
