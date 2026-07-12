import { RENT_REVIEW_WORKFLOW_STATE } from '@/constants/api-enums';
import { isRentReviewDecided } from '@/lib/rent-review';
import {
  calendarDaysUntil,
  deriveRentReviewScheduling,
  RENT_REVIEW_ADVANCE_ORDER_DAYS,
  RENT_REVIEW_CONDUCT_WINDOW_DAYS,
  RENT_REVIEW_STATUTORY_NOTICE_DAYS,
  type RentReviewSchedulingFields,
} from '@/lib/rent-review/scheduling';
import type { RentReviewCase } from '@/lib/types';

export type RentReviewConductCountdownTone =
  | 'ok'
  | 'warning'
  | 'urgent'
  | 'overdue'
  | 'notice_sent'
  | 'complete';

export interface RentReviewScheduleBadge {
  label: string;
  title: string;
  tone: RentReviewConductCountdownTone;
}

export interface RentReviewScheduleIndicators {
  /** T−90 order placed — agent's 30-day conduct window until T−60. */
  orderCountdown: RentReviewScheduleBadge;
  /** T−60 automatic tenant reminder before lease end. */
  tenantReminder: RentReviewScheduleBadge;
}

/** @deprecated Use RentReviewScheduleBadge */
export interface RentReviewConductCountdown extends RentReviewScheduleBadge {
  daysRemaining: number;
  noticeDeadlineOn: string;
  advanceReviewOpensOn: string;
  scheduleAnchor: string;
}

const NOTICE_SENT_STATES = new Set<string>([
  RENT_REVIEW_WORKFLOW_STATE.TENANT_NOTIFIED,
  RENT_REVIEW_WORKFLOW_STATE.NEGOTIATION,
  RENT_REVIEW_WORKFLOW_STATE.TENANT_ACCEPTED,
  RENT_REVIEW_WORKFLOW_STATE.TENANT_REJECTED,
  RENT_REVIEW_WORKFLOW_STATE.ACCOUNTING,
  RENT_REVIEW_WORKFLOW_STATE.COMPLETED,
]);

function formatCountdownLabel(daysRemaining: number): string {
  if (daysRemaining > 1) return `${daysRemaining}d left`;
  if (daysRemaining === 1) return '1d left';
  if (daysRemaining === 0) return 'Due today';
  const overdue = Math.abs(daysRemaining);
  return overdue === 1 ? '1d overdue' : `${overdue}d overdue`;
}

function toneForDays(daysRemaining: number): RentReviewConductCountdownTone {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 7) return 'urgent';
  if (daysRemaining <= 14) return 'warning';
  return 'ok';
}

function toneForUpcoming(daysUntil: number): RentReviewConductCountdownTone {
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 14) return 'warning';
  return 'ok';
}

function isNoticeSent(review: RentReviewCase): boolean {
  const workflowState = review.workflowState?.toUpperCase();
  return Boolean(workflowState && NOTICE_SENT_STATES.has(workflowState));
}

function buildOrderCountdownBadge(
  review: RentReviewCase,
  scheduling: RentReviewSchedulingFields,
  reference: Date,
): RentReviewScheduleBadge {
  if (isRentReviewDecided(review)) {
    return {
      label: 'Complete',
      title: 'Rent review completed',
      tone: 'complete',
    };
  }

  if (isNoticeSent(review)) {
    return {
      label: 'Notice sent',
      title: `Formal tenant notice issued — increase effective from ${scheduling.scheduleAnchor}`,
      tone: 'notice_sent',
    };
  }

  const daysUntilWindowOpens = calendarDaysUntil(scheduling.advanceReviewOpensOn, reference);
  if (daysUntilWindowOpens != null && daysUntilWindowOpens > 0) {
    return {
      label: `Opens in ${daysUntilWindowOpens}d`,
      title:
        `Rent review order opens ${scheduling.advanceReviewOpensOn} ` +
        `(${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before lease end ${scheduling.scheduleAnchor}).`,
      tone: 'ok',
    };
  }

  const conductDaysRemaining = calendarDaysUntil(scheduling.noticeDeadlineOn, reference);
  if (conductDaysRemaining == null) {
    return {
      label: '—',
      title: 'Could not calculate review countdown',
      tone: 'ok',
    };
  }

  return {
    label: formatCountdownLabel(conductDaysRemaining),
    title:
      `${RENT_REVIEW_CONDUCT_WINDOW_DAYS}-day agent conduct window — the rent review must be completed by ` +
      `${scheduling.noticeDeadlineOn} (${RENT_REVIEW_STATUTORY_NOTICE_DAYS} days before lease end ` +
      `${scheduling.scheduleAnchor}, leaving ${RENT_REVIEW_STATUTORY_NOTICE_DAYS} days for the statutory tenant notice).`,
    tone: toneForDays(conductDaysRemaining),
  };
}

function buildTenantReminderBadge(
  review: RentReviewCase,
  scheduling: RentReviewSchedulingFields,
  reference: Date,
): RentReviewScheduleBadge {
  if (isRentReviewDecided(review)) {
    return {
      label: 'Complete',
      title: 'Rent review completed',
      tone: 'complete',
    };
  }

  if (isNoticeSent(review)) {
    return {
      label: 'Sent',
      title: `Tenant notified — statutory ${RENT_REVIEW_STATUTORY_NOTICE_DAYS}-day notice before ${scheduling.scheduleAnchor}`,
      tone: 'notice_sent',
    };
  }

  const daysUntilReminder = calendarDaysUntil(scheduling.noticeDeadlineOn, reference);
  if (daysUntilReminder == null) {
    return {
      label: '—',
      title: 'Could not calculate tenant reminder date',
      tone: 'ok',
    };
  }

  if (daysUntilReminder > 0) {
    return {
      label: `In ${daysUntilReminder}d`,
      title:
        `System sends an automatic tenant reminder on ${scheduling.noticeDeadlineOn} ` +
        `(${RENT_REVIEW_STATUTORY_NOTICE_DAYS} days before lease end ${scheduling.scheduleAnchor}).`,
      tone: toneForUpcoming(daysUntilReminder),
    };
  }

  if (daysUntilReminder === 0) {
    return {
      label: 'Today',
      title:
        `Automatic tenant reminder due today (${scheduling.noticeDeadlineOn}) — ` +
        `${RENT_REVIEW_STATUTORY_NOTICE_DAYS} days before lease end.`,
      tone: 'urgent',
    };
  }

  return {
    label: 'Sent',
    title:
      `Automatic tenant reminder dispatched on ${scheduling.noticeDeadlineOn} ` +
      `(${RENT_REVIEW_STATUTORY_NOTICE_DAYS} days before lease end). Issue formal notice if not yet sent.`,
    tone: 'notice_sent',
  };
}

/**
 * Rent review schedule badges for the property jobs table:
 * - **Countdown** — T−90 order / agent's 30-day conduct window (90 − 60 days before lease end).
 * - **Tenant reminder** — T−60 automatic tenant reminder before lease end.
 */
export function getRentReviewScheduleIndicators(
  review: RentReviewCase,
  reference = new Date(),
): RentReviewScheduleIndicators | null {
  const scheduling = deriveRentReviewScheduling({
    leaseStart: review.leaseStart,
    leaseEnd: review.leaseEnd,
    reviewDue: review.reviewDue,
    leaseType: review.leaseType,
    fixedTermWeeks: review.fixedTermWeeks,
    createdAt: review.createdAt,
  });

  if (!scheduling) return null;

  return {
    orderCountdown: buildOrderCountdownBadge(review, scheduling, reference),
    tenantReminder: buildTenantReminderBadge(review, scheduling, reference),
  };
}

/**
 * Countdown for the 30-day rent review conduct window (order countdown column).
 * Case opens at T−90; tenant reminder fires at T−60.
 */
export function getRentReviewConductCountdown(
  review: RentReviewCase,
  reference = new Date(),
): RentReviewConductCountdown | null {
  const scheduling = deriveRentReviewScheduling({
    leaseStart: review.leaseStart,
    leaseEnd: review.leaseEnd,
    reviewDue: review.reviewDue,
    leaseType: review.leaseType,
    fixedTermWeeks: review.fixedTermWeeks,
    createdAt: review.createdAt,
  });

  if (!scheduling) return null;

  const indicators = getRentReviewScheduleIndicators(review, reference);
  if (!indicators) return null;

  const daysUntilTenantReminder = calendarDaysUntil(scheduling.noticeDeadlineOn, reference);
  const daysUntilWindowOpens = calendarDaysUntil(scheduling.advanceReviewOpensOn, reference);
  const daysRemaining =
    daysUntilWindowOpens != null && daysUntilWindowOpens > 0
      ? daysUntilWindowOpens
      : (daysUntilTenantReminder ?? 0);

  return {
    ...indicators.orderCountdown,
    daysRemaining,
    noticeDeadlineOn: scheduling.noticeDeadlineOn,
    advanceReviewOpensOn: scheduling.advanceReviewOpensOn,
    scheduleAnchor: scheduling.scheduleAnchor,
  };
}
