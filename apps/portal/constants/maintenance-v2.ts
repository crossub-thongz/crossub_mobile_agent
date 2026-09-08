/**
 * Labels and tones for the read-only slices of the Maintenance V2 spine the agent facade exposes
 * on a job detail — the work-order status and the invoice's payment lane.
 *
 * The key sets are derived straight from the contract enums (`AgentMaintenanceWorkOrderDto` /
 * `AgentMaintenanceInvoiceMatchDto`), so a new server value fails the type-check here instead of
 * silently falling through to a missing label — and there are no hand-typed unions to drift.
 * Tones use the app's semantic palette; the panels never inline a hue.
 */

import type { components } from '@crossub-thongz/api-contract';

export type MaintenancePaymentStatus =
  components['schemas']['AgentMaintenanceInvoiceMatchDto']['paymentStatus'];

export type MaintenanceWorkOrderStatus =
  components['schemas']['AgentMaintenanceWorkOrderDto']['status'];

/** Read-only payment lane (§13, §20). The agent sees the state; only staff can move it. */
export const MAINTENANCE_PAYMENT_STATUS_LABEL: Record<MaintenancePaymentStatus, string> = {
  NOT_READY: 'Payment not ready',
  PAYMENT_PENDING: 'Payment pending',
  PAID: 'Paid',
  EXTERNAL_SETTLEMENT: 'Settled externally',
  BLOCKED: 'Payment blocked',
};

export const MAINTENANCE_PAYMENT_STATUS_TONE: Record<MaintenancePaymentStatus, string> = {
  NOT_READY: 'border-border bg-muted/40 text-muted-foreground',
  PAYMENT_PENDING: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  PAID: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  EXTERNAL_SETTLEMENT: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  BLOCKED: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export const MAINTENANCE_WORK_ORDER_STATUS_LABEL: Record<MaintenanceWorkOrderStatus, string> = {
  ISSUED: 'Issued',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  CONTRACTOR_COMPLETED: 'Contractor completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
