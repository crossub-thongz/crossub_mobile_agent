'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

import { EvictionRequiredDialog } from '@/components/agent/eviction-required-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  fetchAgentTribunalRentChasingDetail,
  updateAgentTribunalRentChasing,
  type AgentTribunalRentChasingDetail,
} from '@/lib/crossub-api/agent-workflow-client';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type ArrearRow = AgentTribunalRentChasingDetail['arrears'][number];
type ArrearKind = ArrearRow['kind'];

const ARREARS_SECTIONS: {
  kind: ArrearKind;
  title: string;
  empty: string;
  icon: typeof CircleDollarSign;
}[] = [
  {
    kind: 'rent',
    title: 'Rent Arrears',
    empty: 'No rent arrears recorded on this case.',
    icon: CircleDollarSign,
  },
  {
    kind: 'bill',
    title: 'Bill Arrears',
    empty: 'No bill arrears recorded on this case.',
    icon: Receipt,
  },
  {
    kind: 'bond',
    title: 'Bond Arrears',
    empty: 'No bond arrears recorded on this case.',
    icon: FileText,
  },
];

function cycleLabel(cycle: string | null | undefined): string {
  if (cycle === 'fortnightly') return 'Fortnightly';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'weekly') return 'Weekly';
  return '—';
}

function DaysOverdue({ days }: { days: number | null | undefined }) {
  if (days == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        days > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
      )}
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      {days} day{days === 1 ? '' : 's'}
    </span>
  );
}

function ArrearsSection({
  title,
  empty,
  icon: Icon,
  rows,
  footer,
}: {
  title: string;
  empty: string;
  icon: typeof CircleDollarSign;
  rows: ArrearRow[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm">
      <div className="border-b px-3 py-3">
        <div className="flex items-start gap-2">
          <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
              {rows.length > 0
                ? `${rows.length} item${rows.length === 1 ? '' : 's'}`
                : 'No items'}
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground px-3 py-6 text-center text-xs">{empty}</p>
      ) : (
        <div className="max-h-[min(70vh,640px)] flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-sm">
            <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={`${row.kind}-${row.name}-${index}`}>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-medium leading-snug">{row.name}</p>
                    {row.dueDate ? (
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Due {formatDate(row.dueDate)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 align-top text-muted-foreground">
                    {row.tenantName || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums font-medium">
                    {row.amount != null ? formatCurrency(row.amount) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top">
                    <DaysOverdue days={row.daysOverdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer ? <div className="border-t px-3 py-3">{footer}</div> : null}
    </div>
  );
}

export function TribunalRentChasingDetail({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<AgentTribunalRentChasingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [evictionDialogOpen, setEvictionDialogOpen] = useState(false);

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

  const arrearsByKind = useMemo(() => {
    const grouped: Record<ArrearKind, ArrearRow[]> = {
      rent: [],
      bill: [],
      bond: [],
    };
    for (const row of detail?.arrears ?? []) {
      grouped[row.kind].push(row);
    }
    return grouped;
  }, [detail?.arrears]);

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
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300"
              onClick={() => setEvictionDialogOpen(true)}
            >
              <CheckCircle2 className="size-3.5" />
              Eviction required
            </button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setEvictionDialogOpen(true)}
            >
              <AlertTriangle className="size-3.5" />
              Eviction is Required
            </Button>
          )}
        </div>
      </section>

      <EvictionRequiredDialog
        open={evictionDialogOpen}
        onOpenChange={setEvictionDialogOpen}
        caseId={caseId}
        detail={detail}
        onSaved={setDetail}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
        {ARREARS_SECTIONS.map((section) => (
          <ArrearsSection
            key={section.kind}
            title={section.title}
            empty={section.empty}
            icon={section.icon}
            rows={arrearsByKind[section.kind]}
            footer={
              section.kind === 'rent' ? (
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground font-medium uppercase tracking-wide">
                      Agreement end
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {detail.agreementEnd ? formatDate(detail.agreementEnd) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium uppercase tracking-wide">
                      Current rent
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {detail.currentRent != null
                        ? formatCurrency(detail.currentRent)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium uppercase tracking-wide">
                      Payment cycle
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {cycleLabel(detail.paymentCycle)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground font-medium uppercase tracking-wide">
                      Rent paid to
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {detail.rentPaidTo ? formatDate(detail.rentPaidTo) : '—'}
                    </dd>
                  </div>
                </dl>
              ) : undefined
            }
          />
        ))}
      </div>

      {detail.evictionRequired ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Eviction details
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvictionDialogOpen(true)}
            >
              Edit
            </Button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Lodgement date
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {detail.lodgementDate ? formatDate(detail.lodgementDate) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Hearing date
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {detail.hearingDate ? formatDate(detail.hearingDate) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Hearing notice
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {detail.hearingNoticeUrl ? (
                  <a
                    href={detail.hearingNoticeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {detail.hearingNoticeName ?? 'View file'}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Member&apos;s order
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {detail.membersOrderUrl ? (
                  <a
                    href={detail.membersOrderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {detail.membersOrderName ?? 'View file'}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

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
