'use client';

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  Clock,
  FileOutput,
  FileText,
  FileWarning,
  Mail,
  Plus,
  Repeat,
  Scale,
  Send,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { TrustNewBillDialog } from '@/components/agent/trust/trust-new-bill-dialog';
import { TrustReceiptDialog } from '@/components/agent/trust/trust-receipt-dialog';
import { TrustLoadError, TrustLoading, TrustPill, TrustStat } from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  TRUST_ATTENTION,
  TRUST_BANK_RECONCILIATION_STATUS,
  TRUST_OVERVIEW_COPY as COPY,
  TRUST_TAB,
  TRUST_TONE_TEXT,
  TRUST_TRANSACTION_KIND,
  type TrustAttentionId,
  type TrustTab,
} from '@/constants/trust';
import { useTrustOverview } from '@/hooks/use-trust-overview';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { AGENT_PENDING_MAIL_STATUS, fetchAgentPendingMail } from '@/lib/crossub-api/agent-pending-mail-client';
import type { TrustAccountCode, TrustTransaction } from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { trustAttentionItems } from '@/utils/trust-overview';

const ATTENTION_ICON: Record<TrustAttentionId, LucideIcon> = {
  [TRUST_ATTENTION.OUT_OF_BALANCE]: Scale,
  [TRUST_ATTENTION.OPENING_UNALLOCATED]: AlertTriangle,
  [TRUST_ATTENTION.RECONCILIATION]: Clock,
  [TRUST_ATTENTION.PENDING_MAIL]: Mail,
  [TRUST_ATTENTION.BILLS_INSUFFICIENT]: FileWarning,
  [TRUST_ATTENTION.INVOICES_OVERDUE]: FileText,
  [TRUST_ATTENTION.OWNERS_NO_PAYOUT]: UserX,
  [TRUST_ATTENTION.OWNERS_DUE]: Banknote,
  [TRUST_ATTENTION.BANK_FILE]: FileOutput,
};

const HEALTH_TONE = {
  GOOD: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  WARN: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  BAD: 'bg-destructive/15 text-destructive',
  MUTED: 'bg-secondary text-muted-foreground',
} as const;

const WARN_TEXT = TRUST_TONE_TEXT.WARN;
const GOOD_TEXT = TRUST_TONE_TEXT.GOOD;

const QUICK_ACTION = {
  RECEIVE_RENT: 'RECEIVE_RENT',
  CREATE_BILL: 'CREATE_BILL',
} as const;
type QuickActionDialog = (typeof QUICK_ACTION)[keyof typeof QUICK_ACTION];

function Card({
  title,
  badge,
  actions,
  children,
}: {
  title: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {badge ? <TrustPill className={HEALTH_TONE.WARN}>{badge}</TrustPill> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function TransactionIcon({ tx }: { tx: TrustTransaction }) {
  if (tx.kind === TRUST_TRANSACTION_KIND.WITHDRAWAL) {
    return <ArrowUpRight className="text-destructive size-4 shrink-0" />;
  }
  if (tx.kind === TRUST_TRANSACTION_KIND.JOURNAL) {
    return <Repeat className="text-muted-foreground size-4 shrink-0" />;
  }
  return <ArrowDownLeft className={cn('size-4 shrink-0', GOOD_TEXT)} />;
}

function HealthRow({ label, status, tone }: { label: string; status: string; tone: string }) {
  const Icon = tone === HEALTH_TONE.GOOD ? Check : tone === HEALTH_TONE.MUTED ? Clock : AlertTriangle;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-sm">
        <Icon
          className={cn(
            'size-4 shrink-0',
            tone === HEALTH_TONE.GOOD ? GOOD_TEXT : tone === HEALTH_TONE.MUTED ? 'text-muted-foreground' : WARN_TEXT,
          )}
        />
        {label}
      </span>
      <TrustPill className={tone}>{status}</TrustPill>
    </li>
  );
}

export function TrustOverviewTab({
  agencyId,
  bankAccountId,
  accountCodes,
  onOpenTab,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  onOpenTab: (tab: TrustTab) => void;
}) {
  const { data, error, loading, reload } = useTrustOverview(agencyId, bankAccountId);
  const pendingMail = useTrustResource(`${agencyId}:${bankAccountId}:pending-mail-count`, () =>
    fetchAgentPendingMail(agencyId, bankAccountId, {
      status: AGENT_PENDING_MAIL_STATUS.PENDING,
      page: 1,
      pageSize: 1,
    }),
  );
  const [dialog, setDialog] = useState<QuickActionDialog | null>(null);

  if (!data) {
    return error ? <TrustLoadError error={error} onRetry={reload} /> : loading ? <TrustLoading /> : null;
  }

  const rec = data.trustBankAccount.reconciliation;
  const reconciled = rec.status === TRUST_BANK_RECONCILIATION_STATUS.RECONCILED;
  const tile = data.reconciliation;
  const unallocated = data.openingUnallocatedCents !== 0;
  const attention = trustAttentionItems(data, pendingMail.data?.total ?? null);

  const quickActions: { label: string; icon: LucideIcon; onClick: () => void }[] = [
    { label: COPY.receiveRent, icon: Plus, onClick: () => setDialog(QUICK_ACTION.RECEIVE_RENT) },
    { label: COPY.createBill, icon: FileText, onClick: () => setDialog(QUICK_ACTION.CREATE_BILL) },
    { label: COPY.disburse, icon: Send, onClick: () => onOpenTab(TRUST_TAB.DISBURSE) },
    { label: COPY.reconcile, icon: Scale, onClick: () => onOpenTab(TRUST_TAB.RECONCILIATION) },
  ];

  return (
    <div className={cn('space-y-4', loading && 'opacity-70')}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrustStat
          label={COPY.cashBook}
          value={formatCents(data.cashBookBalanceCents)}
          hint={COPY.asAt(formatTrustDate(data.today.date))}
        />
        <TrustStat
          label={COPY.allocatedFolios}
          value={formatCents(data.ledgerBalanceCents)}
          tone={unallocated ? WARN_TEXT : undefined}
          hint={unallocated ? COPY.openingUnallocatedHint(formatCents(data.openingUnallocatedCents)) : COPY.allAllocated}
        />
        <TrustStat
          label={COPY.paymentsPending}
          value={formatCents(data.poolPaymentCents)}
          hint={COPY.awaitingBankFile(data.poolPaymentCount)}
        />
        <TrustStat
          label={COPY.monthReconciliation}
          value={reconciled ? COPY.reconciled : COPY.unreconciled}
          tone={reconciled ? GOOD_TEXT : WARN_TEXT}
          hint={
            tile.monthsToLock > 0
              ? COPY.monthsToLock(tile.currentLabel, tile.monthsToLock)
              : COPY.monthOpen(tile.currentLabel)
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card
            title={COPY.attention}
            badge={attention.length > 0 ? COPY.attentionCount(attention.length) : undefined}
          >
            {attention.length === 0 ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Check className={cn('size-4', GOOD_TEXT)} />
                {COPY.allClear}
              </p>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => {
                  const Icon = ATTENTION_ICON[item.id];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onOpenTab(item.tab)}
                        className="hover:bg-secondary/60 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                      >
                        <Icon className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          <span className="text-muted-foreground block truncate text-xs">{item.detail}</span>
                        </span>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={COPY.quickActions}>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="hover:bg-secondary/60 flex flex-col items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors"
                >
                  <Icon className="text-primary size-4" />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title={COPY.recent}
            actions={
              <Button type="button" size="sm" variant="outline" onClick={() => onOpenTab(TRUST_TAB.TRANSACTIONS)}>
                {COPY.viewAll}
                <ArrowRight className="size-3.5" />
              </Button>
            }
          >
            {data.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">{COPY.noRecent}</p>
            ) : (
              <ul className="divide-y">
                {data.recentTransactions.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-3 py-2.5">
                    <TransactionIcon tx={tx} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <p className="text-muted-foreground text-xs">
                        #{tx.auditNumber} · {formatTrustDate(tx.effectiveDate)}
                        {tx.partyName ? ` · ${tx.partyName}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCents(tx.cashAmountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={COPY.health}>
            <ul className="divide-y">
              <HealthRow
                label={COPY.cashbookArithmetic}
                status={data.differenceCents === 0 ? COPY.balanced : COPY.outBy(formatCents(data.differenceCents))}
                tone={data.differenceCents === 0 ? HEALTH_TONE.GOOD : HEALTH_TONE.BAD}
              />
              <HealthRow
                label={COPY.unallocatedOpening}
                status={unallocated ? COPY.needsReview : COPY.allocated}
                tone={unallocated ? HEALTH_TONE.WARN : HEALTH_TONE.GOOD}
              />
              <HealthRow
                label={COPY.bankReconciliation}
                status={reconciled ? COPY.reconciled : COPY.incomplete}
                tone={reconciled ? HEALTH_TONE.GOOD : HEALTH_TONE.MUTED}
              />
            </ul>
          </Card>
        </div>
      </div>

      {dialog === QUICK_ACTION.RECEIVE_RENT ? (
        <TrustReceiptDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          onClose={() => setDialog(null)}
          onReceipted={() => {
            reload();
            pendingMail.reload();
          }}
        />
      ) : null}
      {dialog === QUICK_ACTION.CREATE_BILL ? (
        <TrustNewBillDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          onClose={() => setDialog(null)}
          onCreated={reload}
        />
      ) : null}
    </div>
  );
}
