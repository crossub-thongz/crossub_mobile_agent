import { toast } from 'sonner';

import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import { inspectionDetail } from '@/constants/routes';
import { fromTasks } from '@/lib/detail-navigation';
import { finalizeBillingChargePayment } from '@/lib/billing/finalize-billing-payment';
import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import {
  fetchAgentBillingSummary,
  fetchAgentInspectionPlatformCharge,
  payAgentBillingCharge,
  payAllAgentBilling,
  type AgentBillingCharge,
} from '@/lib/crossub-api/agent-billing-client';
import { formatCurrency } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  letting_fee: 'Letting fee',
};

export const AGENT_PAY_NOW_EVENT = 'crossub-agent-pay-now';

export type AgentPayNowDetail = {
  href?: string;
};

export function requestAgentPayNow(detail?: AgentPayNowDetail): void {
  window.dispatchEvent(new CustomEvent<AgentPayNowDetail>(AGENT_PAY_NOW_EVENT, { detail }));
}

export function isPrepaidAwaitingCharge(row: AgentBillingCharge): boolean {
  return (
    row.status === 'awaiting_payment' &&
    String(row.collectionMode).toLowerCase() === 'prepaid' &&
    Number(row.amount) > 0 &&
    row.includedInAllowance !== true
  );
}

export function inspectionIdFromAgentHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) path = new URL(trimmed).pathname;
  } catch {
    /* keep path */
  }
  const q = path.indexOf('?');
  const clean = (q >= 0 ? path.slice(0, q) : path).replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);
  if (parts[0] === 'inspections' && parts[1] && parts[1] !== 'new') return parts[1];
  if (parts[0] === 'vacating' && parts[1] === 'outgoing' && parts[2]) return parts[2];
  return null;
}

/** Job page that already has its own Pay card — hide the app-wide reminder there. */
export function isOnUnpaidInspectionTaskPath(
  pathname: string,
  unpaidCharges: Array<{ jobCaseId?: string | null }>,
  inspections: Array<{ id: string; awaitingAgentPayment?: boolean }>,
): boolean {
  const id = inspectionIdFromAgentHref(pathname);
  if (!id) return false;
  if (unpaidCharges.some((row) => row.jobCaseId?.trim() === id)) return true;
  return inspections.some((row) => row.id === id && row.awaitingAgentPayment === true);
}

/** Query flag so the task page opens the Stripe popup after Pay now. */
export const AGENT_OPEN_PAYMENT_QUERY = 'pay';

export function withOpenPaymentQuery(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return trimmed;
  const q = trimmed.indexOf('?');
  const path = q >= 0 ? trimmed.slice(0, q) : trimmed;
  const params = new URLSearchParams(q >= 0 ? trimmed.slice(q + 1) : '');
  params.set(AGENT_OPEN_PAYMENT_QUERY, '1');
  return `${path}?${params.toString()}`;
}

export function shouldAutoOpenInspectionPayment(
  searchParams: Pick<URLSearchParams, 'get'>,
): boolean {
  return searchParams.get(AGENT_OPEN_PAYMENT_QUERY) === '1';
}

/** Task page for an unpaid prepaid inspection — Pay now goes here instead of charging in place. */
export function unpaidInspectionTaskHref(
  unpaidCharges: Array<{
    jobCaseId?: string | null;
    jobCaseName?: string | null;
    createdAt?: string;
  }>,
  inspections: Array<{
    id: string;
    trackingNumber?: string;
    awaitingAgentPayment?: boolean;
  }>,
): string | null {
  const sorted = [...unpaidCharges].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  for (const charge of sorted) {
    const caseId = charge.jobCaseId?.trim();
    if (caseId) {
      const match = inspections.find((row) => row.id === caseId);
      return withOpenPaymentQuery(inspectionDetail(match?.id ?? caseId, fromTasks()));
    }
    const name = charge.jobCaseName?.trim();
    if (name) {
      const match = inspections.find((row) => row.trackingNumber === name);
      if (match) return withOpenPaymentQuery(inspectionDetail(match.id, fromTasks()));
    }
  }

  const awaiting = inspections.find((row) => row.awaitingAgentPayment);
  return awaiting ? withOpenPaymentQuery(inspectionDetail(awaiting.id, fromTasks())) : null;
}

function dialogForCharge(
  row: AgentBillingCharge,
  defaultPaymentMethod: StripePaymentDialogState['defaultPaymentMethod'],
): Parameters<typeof resolvePaymentFlow>[1] {
  const label = SERVICE_LABEL[row.serviceType] ?? 'Platform fee';
  return {
    title: `${label} — payment required`,
    description: row.description,
    amountAud: row.amount,
    calculationDetail: row.calculationDetail,
    calculationSummary: row.calculationSummary,
    defaultPaymentMethod,
    chargeId: row.id,
  };
}

export type AgentPayNowResult = 'dialog' | 'complete' | 'nothing' | 'failed';

export async function startAgentPrepaidPayment(opts: {
  charges?: AgentBillingCharge[];
  href?: string;
  setPaymentDialog: (state: StripePaymentDialogState | null) => void;
}): Promise<AgentPayNowResult> {
  const summary = await fetchAgentBillingSummary();
  if (summary.platformBillingDisabled) {
    toast.message('Platform billing is paused for your service plan. There is nothing to pay.');
    return 'nothing';
  }

  const hrefInspectionId = opts.href ? inspectionIdFromAgentHref(opts.href) : null;
  if (hrefInspectionId) {
    const linked = await fetchAgentInspectionPlatformCharge(hrefInspectionId).catch(() => null);
    if (linked && (linked.includedInAllowance || linked.status === 'included' || Number(linked.amount) <= 0)) {
      toast.message('This job is included in your yearly allowance — nothing to pay.');
      return 'nothing';
    }
    if (linked && (linked.status === 'paid' || linked.status === 'accrued' || linked.status === 'invoiced')) {
      toast.message('This fee has already been billed — nothing to pay now.');
      return 'nothing';
    }
    if (linked && isPrepaidAwaitingCharge(linked)) {
      const result = await payAgentBillingCharge(linked.id, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        dialogForCharge(linked, summary.defaultPaymentMethod),
        opts.setPaymentDialog,
      );
      if (outcome === 'complete') {
        await finalizeBillingChargePayment(linked.id);
        toast.success('Payment complete — thank you');
      }
      return outcome === 'failed' ? 'failed' : outcome;
    }
  }

  const payable = (opts.charges ?? []).filter(isPrepaidAwaitingCharge);
  if (payable.length === 0) {
    toast.message('There is nothing to pay right now.');
    return 'nothing';
  }

  if (payable.length === 1) {
    const row = payable[0]!;
    const result = await payAgentBillingCharge(row.id, { devConfirm: false });
    const outcome = resolvePaymentFlow(
      result,
      dialogForCharge(row, summary.defaultPaymentMethod),
      opts.setPaymentDialog,
    );
    if (outcome === 'complete') {
      await finalizeBillingChargePayment(row.id);
      toast.success('Payment complete — thank you');
    }
    return outcome === 'failed' ? 'failed' : outcome;
  }

  const result = await payAllAgentBilling({ devConfirm: false });
  const outcome = resolvePaymentFlow(
    result,
    {
      title: 'Pay outstanding platform fees',
      description: `${payable.length} bill(s) · ${formatCurrency(result.totalAmountAud)}`,
      amountAud: result.totalAmountAud,
      defaultPaymentMethod: summary.defaultPaymentMethod,
    },
    opts.setPaymentDialog,
  );
  if (outcome === 'complete') {
    toast.success(
      `Paid ${result.paidChargeCount + result.paidInvoiceCount} bill(s) — ${formatCurrency(result.totalAmountAud)}`,
    );
  }
  return outcome === 'failed' ? 'failed' : outcome;
}
