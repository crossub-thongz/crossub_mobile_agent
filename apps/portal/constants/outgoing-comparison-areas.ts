/** Room / section list mirrored from the inspector mobile app. */
export const OUTGOING_COMPARISON_AREAS = [
  'Entry',
  'Living Room',
  'Kitchen',
  'Laundry',
  'Bedroom',
  'Bathroom',
  'Balcony',
  'Garage',
  'Security',
  'General & Exterior',
] as const;

export type OutgoingComparisonArea = (typeof OUTGOING_COMPARISON_AREAS)[number];
