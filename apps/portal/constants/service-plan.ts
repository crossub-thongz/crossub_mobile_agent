import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import type { RegisterablePortalServiceLevel } from '@/lib/portal-service-level';

/** Settings → Plan card copy. Plan names, price tags and descriptions live in `lib/portal-service-level.ts`. */
export const PLAN_SETTINGS_COPY = {
  title: 'Plan',
  description:
    'Self-Manage is free, and you can pay for a CROSSUB inspector on any single job. Inspection Only and Full Service are optional paid plans where CROSSUB does agreed work for you.',
  currentPlan: 'Current plan',
  switchTo: 'Switch to this plan',
  principalOnly: 'Only your agency principal can change the plan.',
  /** Mirrors the API's 403 for a Legacy agency (`AGENT_PORTAL_LEGACY_PLAN_LOCKED_MESSAGE`). */
  legacyLocked: 'Legacy plans are changed by your CROSSUB account manager',
  confirmTitle: (planLabel: string) => `Switch to ${planLabel}?`,
  confirmAction: 'Switch plan',
  switching: 'Switching…',
  cancel: 'Cancel',
  switched: (planLabel: string) => `Plan changed to ${planLabel}`,
  switchFailed: 'Could not change the plan. Try again.',
} as const;

/** What changes for the agency after a switch — shown in the confirmation dialog. */
export const PLAN_SWITCH_CONSEQUENCE: Record<RegisterablePortalServiceLevel, string> = {
  SELF_MANAGED: `You run day-to-day work on this agency's portfolio yourself, with ${CROS_ASSISTANT_NAME} assisting. There are no platform fees, and owners get an emailed copy of your decisions. You pay only when you choose a CROSSUB inspector for a job.`,
  LEVEL_1_INSPECTION_ONLY:
    'CROSSUB carries out the inspections and tribunal support you order, and you pay when you place each order. The portal is limited to inspections and tribunal on this plan.',
  LEVEL_2_FULL_MANAGEMENT:
    "CROSSUB runs agreed day-to-day operations on this agency's portfolio. A platform fee on your management income is invoiced monthly.",
};

/** Self-Manage section on the Platform pricing page. */
export const SELF_MANAGED_PRICING_COPY = {
  title: 'Self-Manage',
  badge: 'Free',
  subtitle: `Run your whole portfolio yourself with the software and ${CROS_ASSISTANT_NAME}.`,
  howYouPay: 'Free · pay per CROSSUB job',
  points: [
    'No platform fees or monthly invoices',
    'Choose a CROSSUB inspector for any job and pay Inspection Only rates by card when you book it',
    `Maintenance, inspections, leasing, conversations and accounting, with ${CROS_ASSISTANT_NAME} assisting`,
    'Owners get an emailed copy of your decisions',
    'Switch to Inspection Only or Full Service anytime from Settings → Plan',
  ],
} as const;

/**
 * Invoice page on Self-Manage: the tier is free. The only bills are CROSSUB inspections the agent
 * chose for a job, prepaid at Inspection Only rates (Geng Xu 28 Oct, Daniel Zhou 29 Oct 2026).
 */
export const SELF_MANAGED_BILLING_NOTE =
  'Self-Manage is free. You pay only for the CROSSUB services you choose, by card before each one starts. A CROSSUB inspection no inspector accepts within 48 hours is refunded.';
