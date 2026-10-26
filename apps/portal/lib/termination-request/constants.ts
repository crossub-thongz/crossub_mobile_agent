import { AUSTRALIAN_STATE } from '@/constants/api-enums';

/**
 * Termination requests (agent lodge form).
 *
 * Mirrors `crossub_web/apps/api/src/constants/termination-request.constants.ts`.
 * The API's `GET /agent/termination-reasons` is the source of the list the form
 * offers; the copy below is only used to recognise a reason title in a bell.
 * Only AU-NSW is open, and only for a property in NSW.
 */
export const TERMINATION_REQUEST_JURISDICTION = 'AU-NSW';

/** The one property state that opens termination reasons. */
export const TERMINATION_REQUEST_STATE = AUSTRALIAN_STATE.NSW;

export type TerminationReasonOption = {
  code: string;
  title: string;
};

/** Same codes and titles, in the same order, as the API's AU_NSW_TERMINATION_REASONS. */
export const NSW_TERMINATION_REASONS: readonly TerminationReasonOption[] = [
  { code: 'RENT_ARREARS', title: 'Rent Arrears' },
  { code: 'BREACH_OF_AGREEMENT', title: 'Breach of Agreement' },
  { code: 'ACTUAL_SALE', title: 'Actual Sale' },
  { code: 'PROPOSED_SALE', title: 'Proposed Sale' },
  { code: 'SIGNIFICANT_RENOVATIONS', title: 'Significant Renovations' },
  { code: 'DEMOLITION', title: 'Demolition' },
  { code: 'CHANGE_OF_USE', title: 'Change of Use' },
  { code: 'LANDLORD_OCCUPATION', title: 'Landlord Occupation' },
  { code: 'END_OF_EMPLOYMENT', title: 'End of Employment' },
];

/** The API's bell title for a termination notice (`TERMINATION_NOTIFICATION_TITLE`). */
export const TERMINATION_NOTIFICATION_TITLE = 'Termination';

/** The API's bell link root: `/termination/<requestId>`. The agent app has no such page. */
export const TERMINATION_NOTIFICATION_HREF_PREFIX = '/termination/';
