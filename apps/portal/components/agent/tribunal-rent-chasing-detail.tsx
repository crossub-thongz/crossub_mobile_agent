'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  fetchAgentTribunalRentChasingDetail,
  updateAgentTribunalRentChasing,
  type AgentTribunalRentChasingDetail,
} from '@/lib/crossub-api/agent-workflow-client';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function cycleLabel(cycle: string | null | undefined): string {
  if (cycle === 'fortnightly') return 'Fortnightly';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'weekly') return 'Weekly';
  return '—';
}

function formatDaysOverdue(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days === 0) return '0 days';
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function TribunalRentChasingDetail({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<AgentTribunalRentChasingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [markingEviction, setMarkingEviction] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAgentTribunalRentChasingDetail(caseId);
      setDetail(next);
      setNotes(next.agentNotes ?? '');
      setNotesDirty(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tribunal case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const next = await updateAgentTribunalRentChasing(caseId, { agentNotes: notes });
      setDetail(next);
      setNotes(next.agentNotes ?? '');
      setNotesDirty(false);
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const markEvictionRequired = async () => {
    if (detail?.evictionRequired) return;
    setMarkingEviction(true);
    try {
      const next = await updateAgentTribunalRentChasing(caseId, {
        evictionRequired: true,
      });
      setDetail(next);
      toast.success('Eviction marked as required');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update case');
    } finally {
      setMarkingEviction(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading Rent Chasing details…
      </div>
    );
  }

  if (error && !detail) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!detail) return null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Rent Chasing
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug">
              {detail.propertyAddress}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {detail.caseNumber}
              {detail.tenantName ? ` · ${detail.tenantName}` : ''}
            </p>
          </div>
          {detail.evictionRequired ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              <CheckCircle2 className="size-3.5" />
              Eviction required
            </span>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={markingEviction}
              onClick={() => void markEvictionRequired()}
            >
              {markingEviction ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="size-3.5" />
              )}
              Eviction is Required
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Tenancy summary
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Agreement end
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {detail.agreementEnd ? formatDate(detail.agreementEnd) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Current rent
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {detail.currentRent != null ? formatCurrency(detail.currentRent) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Payment cycle
            </dt>
            <dd className="mt-1 text-sm font-medium">{cycleLabel(detail.paymentCycle)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Rent paid to
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {detail.rentPaidTo ? formatDate(detail.rentPaidTo) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Arrears
        </p>
        {detail.arrears.length === 0 ? (
          <p className="text-muted-foreground text-xs">No arrears recorded on this case.</p>
        ) : (
          <ul className="space-y-2">
            {detail.arrears.map((row, index) => (
              <li
                key={`${row.kind}-${row.name}-${index}`}
                className="rounded-lg border bg-secondary/20 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Tenant · {row.tenantName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {row.amount != null ? formatCurrency(row.amount) : '—'}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-xs font-medium',
                        (row.daysOverdue ?? 0) > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatDaysOverdue(row.daysOverdue)} overdue
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Notes</p>
            <p className="text-muted-foreground text-xs">
              Agent notes for this Rent Chasing case.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!notesDirty || savingNotes}
            onClick={() => void saveNotes()}
          >
            {savingNotes ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save notes'
            )}
          </Button>
        </div>
        <Label className="sr-only" htmlFor="tribunal-agent-notes">
          Notes
        </Label>
        <textarea
          id="tribunal-agent-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={4}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          placeholder="Add notes for this tribunal case…"
        />
      </section>
    </div>
  );
}
