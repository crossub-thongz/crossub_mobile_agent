'use client';

import { Loader2, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustEmailOwnerButton,
  TrustEmailStatusPill,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustSearchInput,
  TrustStatementPdfButton,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_DISBURSE_COPY as COPY,
  TRUST_DISBURSE_PARTY_COPY,
  TRUST_DISBURSEMENT_BLOCKED_LABEL,
  TRUST_DISBURSEMENT_KIND_FOR_TAB,
  TRUST_DISBURSEMENT_TAB,
  TRUST_DISBURSEMENT_TABS,
  TRUST_LEDGERS_COPY,
  TRUST_PAGE_COPY,
  TRUST_PAGE_SIZE_MAX,
  TRUST_STATEMENT_EMAIL_COPY,
  TRUST_STATEMENT_EMAIL_STATUS,
  type TrustDisbursementTab,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import {
  disburseTrust,
  fetchTrustDisbursementCandidates,
  type AgentTrustDisbursementResult,
  type AgentTrustStatementEmail,
} from '@/lib/crossub-api/agent-trust-client';
import {
  formatCents,
  formatTrustDate,
  newTrustIdempotencyKey,
  trustStatementFilename,
  trustTodayKey,
} from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function TrustDisburseTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const [tab, setTab] = useState<TrustDisbursementTab>(TRUST_DISBURSEMENT_TAB.DUE_OWNERS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [date, setDate] = useState(trustTodayKey);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AgentTrustDisbursementResult | null>(null);
  const query = useDebouncedValue(search.trim());
  const kind = TRUST_DISBURSEMENT_KIND_FOR_TAB[tab];
  const party = TRUST_DISBURSE_PARTY_COPY[kind];

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${tab}:${query}`,
    () =>
      fetchTrustDisbursementCandidates(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        tab,
        search: query || undefined,
      }),
  );

  const payable = useMemo(
    () => (data?.items ?? []).filter((c) => c.canDisburse),
    [data],
  );
  const selectedIds = payable.map((c) => c.ledger.id).filter((id) => selected.has(id));
  const allSelected = payable.length > 0 && selectedIds.length === payable.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(payable.map((c) => c.ledger.id)));
  }

  function openConfirm() {
    if (selectedIds.length === 0) {
      toast.error(party.noneSelected);
      return;
    }
    setConfirmKey(newTrustIdempotencyKey());
  }

  async function onDisburse() {
    if (!confirmKey) return;
    setPending(true);
    try {
      const next = await disburseTrust(agencyId, bankAccountId, {
        idempotencyKey: confirmKey,
        kind,
        disbursementDate: date,
        ledgerIds: selectedIds,
      });
      setResult(next);
      setSelected(new Set());
      setConfirmKey(null);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {result ? (
        <DisbursementResult agencyId={agencyId} result={result} onDismiss={() => setResult(null)} />
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={party.searchPlaceholder} />
        <div className="min-w-0 flex-1">
          <FilterChips
            options={TRUST_DISBURSEMENT_TABS}
            value={tab}
            onChange={(next) => {
              setTab(next);
              setSelected(new Set());
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trust-disburse-date">{COPY.date}</Label>
          <Input
            id="trust-disburse-date"
            type="date"
            className="h-9 w-44"
            value={date}
            max={trustTodayKey()}
            disabled={pending}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={pending || selectedIds.length === 0 || !date}
          onClick={openConfirm}
        >
          <Send className="size-4" />
          {party.disburse(selectedIds.length)}
        </Button>
      </div>

      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query ? TRUST_PAGE_COPY.noMatches : party.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'w-10')}>
                  <input
                    type="checkbox"
                    className="size-4"
                    aria-label={COPY.selectAll}
                    checked={allSelected}
                    disabled={payable.length === 0 || pending}
                    onChange={toggleAll}
                  />
                </th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{party.party}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.property}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden text-right md:table-cell')}>
                  {COPY.balance}
                </th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden text-right md:table-cell')}>
                  {COPY.billsDue}
                </th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.available}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.nextDue}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.ledger.id} className="border-b last:border-b-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <input
                      type="checkbox"
                      className="size-4"
                      aria-label={c.ledger.name}
                      checked={selected.has(c.ledger.id)}
                      disabled={!c.canDisburse || pending}
                      onChange={() => toggle(c.ledger.id)}
                    />
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{c.ledger.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">{c.ledger.code}</p>
                    {c.blockedReason ? (
                      <p className="mt-0.5 text-xs text-amber-600">
                        {TRUST_DISBURSEMENT_BLOCKED_LABEL[c.blockedReason]}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground hidden lg:table-cell')}>
                    {c.property?.referenceAddress ?? '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden text-right tabular-nums md:table-cell')}>
                    {formatCents(c.balanceCents)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden text-right tabular-nums md:table-cell')}>
                    {c.billsDueCount > 0 ? formatCents(c.billsDueCents) : '—'}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right font-medium tabular-nums')}>
                    {formatCents(c.availableToPayCents)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden whitespace-nowrap lg:table-cell')}>
                    {formatTrustDate(c.nextPayoutDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={confirmKey !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmKey(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{party.confirmTitle}</DialogTitle>
            <DialogDescription>{party.confirmBody(selectedIds.length)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmKey(null)}>
              {COPY.cancel}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void onDisburse()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {COPY.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisbursementResult({
  agencyId,
  result,
  onDismiss,
}: {
  agencyId: string;
  result: AgentTrustDisbursementResult;
  onDismiss: () => void;
}) {
  const { run } = result;
  const [emails, setEmails] = useState<AgentTrustStatementEmail[]>(result.statementEmails);
  const itemByStatement = useMemo(
    () => new Map(run.items.filter((i) => i.statementId).map((i) => [i.statementId as string, i])),
    [run.items],
  );

  function onResent(next: AgentTrustStatementEmail) {
    setEmails((prev) => prev.map((e) => (e.statementId === next.statementId ? next : e)));
  }

  return (
    <TrustPanel
      title={COPY.resultTitle(run.runNumber)}
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          {COPY.dismiss}
        </Button>
      }
    >
      <p className="text-sm">
        {COPY.resultSummary(run.paidCount, run.skippedCount, formatCents(run.payoutCents))}
      </p>
      <p className="text-muted-foreground mt-4 mb-2 text-xs font-semibold uppercase tracking-wide">
        {COPY.statementEmails}
      </p>
      {emails.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.noStatements}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {emails.map((email) => {
            const item = itemByStatement.get(email.statementId);
            return (
              <li
                key={email.statementId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item?.ledger.name ?? email.ledgerId}</p>
                  <p className="text-muted-foreground text-xs">
                    {email.ownerEmail ?? '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TrustEmailStatusPill status={email.status} />
                  {item?.statementNumber != null ? (
                    <TrustStatementPdfButton
                      agencyId={agencyId}
                      statementId={email.statementId}
                      filename={trustStatementFilename(item.ledger.code, item.statementNumber)}
                      label={TRUST_LEDGERS_COPY.downloadPdf}
                    />
                  ) : null}
                  {email.status !== TRUST_STATEMENT_EMAIL_STATUS.SENT ? (
                    <TrustEmailOwnerButton
                      agencyId={agencyId}
                      statementId={email.statementId}
                      label={TRUST_STATEMENT_EMAIL_COPY.resend}
                      onResult={onResent}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </TrustPanel>
  );
}
