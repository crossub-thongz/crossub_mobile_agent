import { RENT_REVIEW_WORKFLOW_STATE } from '@/constants/api-enums';
import { isRentReviewDecided } from '@/lib/rent-review';
import {
  calendarDaysUntil,
  deriveRentReviewScheduling,
  RENT_REVIEW_ADVANCE_ORDER_DAYS,
  RENT_REVIEW_CONDUCT_WINDOW_DAYS,
} from '@/lib/rent-review/scheduling';
import type { RentReviewCase } from '@/lib/types';

export type RentReviewConductCountdownTone =
  | 'ok'
  | 'warning'
  | 'urgent'
  | 'overdue'
  | 'notice_sent'
  | 'complete';

export interface RentReviewConductCountdown {
  /** Days until the 60-day notice deadline (negative = overdue). */
  daysRemaining: number;
  noticeDeadlineOn: string;
  advanceReviewOpensOn: string;
  scheduleAnchor: string;
  label: string;
  title: string;
  tone: RentReviewConductCountdownTone;
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

/**
 * Countdown for the 30-day rent review conduct window.
 * Case opens at T−90; tenant notice must go out by T−60 (60-day statutory notice).
 */
export function getRentReviewConductCountdown(
  review: RentReviewCase,
  reference = new Date(),
): RentReviewConductCountdown | null {
  if (isRentReviewDecided(review)) {
    return {
      daysRemaining: 0,
      noticeDeadlineOn: '',
      advanceReviewOpensOn: '',
      scheduleAnchor: '',
      label: 'Complete',
      title: 'Rent review completed',
      tone: 'complete',
    };
  }

  const scheduling = deriveRentReviewScheduling({
    leaseStart: review.leaseStart,
    leaseEnd: review.leaseEnd,
    reviewDue: review.reviewDue,
    leaseType: review.leaseType,
    fixedTermWeeks: review.fixedTermWeeks,
    createdAt: review.createdAt,
  });

  if (!scheduling) return null;

  const workflowState = review.workflowState?.toUpperCase();
  if (workflowState && NOTICE_SENT_STATES.has(workflowState)) {
    return {
      daysRemaining: 0,
      noticeDeadlineOn: scheduling.noticeDeadlineOn,
      advanceReviewOpensOn: scheduling.advanceReviewOpensOn,
      scheduleAnchor: scheduling.scheduleAnchor,
      label: 'Notice sent',
      title: `60-day tenant notice issued — increase effective from ${scheduling.scheduleAnchor}`,
      tone: 'notice_sent',
    };
  }

  const daysUntilWindowOpens = calendarDaysUntil(scheduling.advanceReviewOpensOn, reference);
  if (daysUntilWindowOpens != null && daysUntilWindowOpens > 0) {
    return {
      daysRemaining: daysUntilWindowOpens,
      noticeDeadlineOn: scheduling.noticeDeadlineOn,
      advanceReviewOpensOn: scheduling.advanceReviewOpensOn,
      scheduleAnchor: scheduling.scheduleAnchor,
      label: `Opens in ${daysUntilWindowOpens}d`,
      title:
        `Rent review opens ${scheduling.advanceReviewOpensOn} ` +
        `(~${RENT_REVIEW_ADVANCE_ORDER_DAYS} days before ${scheduling.scheduleAnchor}).`,
      tone: 'ok',
    };
  }

  const daysRemaining = calendarDaysUntil(scheduling.noticeDeadlineOn, reference);
  if (daysRemaining == null) return null;

  return {
    daysRemaining,
    noticeDeadlineOn: scheduling.noticeDeadlineOn,
    advanceReviewOpensOn: scheduling.advanceReviewOpensOn,
    scheduleAnchor: scheduling.scheduleAnchor,
    label: formatCountdownLabel(daysRemaining),
    title:
      `${RENT_REVIEW_CONDUCT_WINDOW_DAYS}-day review window — ` +
      `notice must be sent by ${scheduling.noticeDeadlineOn} ` +
      `(60-day tenant notice before ${scheduling.scheduleAnchor}). ` +
      `Case opened ~90 days ahead.`,
    tone: toneForDays(daysRemaining),
  };
}
