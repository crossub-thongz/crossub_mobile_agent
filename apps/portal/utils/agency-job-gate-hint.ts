import { AGENCY_JOB_GATE_HINT } from '@/constants/inspection-approval';

type AgencyHintStep = keyof typeof AGENCY_JOB_GATE_HINT;

function isAgencyHintStep(step: string): step is AgencyHintStep {
  return Object.hasOwn(AGENCY_JOB_GATE_HINT, step);
}

/** The progress hint for a step; on an agency job the review steps speak to the agency, not CROSSUB. */
export function gateHintFor<S extends string>(
  hints: Record<S, string>,
  step: S,
  agencyConducted: boolean,
): string {
  if (agencyConducted && isAgencyHintStep(step)) return AGENCY_JOB_GATE_HINT[step];
  return hints[step];
}
