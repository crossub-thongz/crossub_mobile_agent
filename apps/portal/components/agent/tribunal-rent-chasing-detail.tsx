'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Pencil,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

import { EvictionRequiredDialog } from '@/components/agent/eviction-required-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  fetchAgentTribunalRentChasingDetail,
  updateAgentTribunalRentChasing,
  type AgentTribunalRentChasingDetail,
} from '@/lib/crossub-api/agent-workflow-client';
import {
  cn,
  daysSinceDate,
  daysSinceVacate,
  formatCurrency,
  formatDate,
} from '@/lib/utils';

type ArrearRow = AgentTribunalRentChasingDetail['arrears'][number];
type ArrearKind = ArrearRow['kind'];

function cycleLabel(cycle: string | null | undefined): string {
  if (cycle === 'fortnightly') return 'Fortnightly';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'weekly') return 'Weekly';
  return '—';
}

function DaysSince({
  kind,
  dueDate,
  fallbackDays,
}: {
  kind: ArrearKind;
  dueDate?: string | null;
  fallbackDays?: number | null;
}) {
  // Rent / bill: paid-to or due date → today.
  // Bond: agreement end → today, only once the tenant has vacated.
  // Never fall back to case created-at.
  const fromDate =
    kind === 'bond' ? daysSinceVacate(dueDate) : daysSinceDate(dueDate);
  const days = fromDate ?? fallbackDays ?? null;
  if (days == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        days > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
      )}
      title={
        dueDate ? `Days from ${formatDate(dueDate)} through today` : undefined
      }
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      {days} day{days === 1 ? '' : 's'}
    </span>
  );
}

function ArrearsSection({
  kind,
  title,
  empty,
  icon: Icon,
  rows,
  dateLabel,
  dateValue,
  onSaveDate,
  billDates,
  onSaveBillDates,
}: {
  kind: ArrearKind;
  title: string;
  empty: string;
  icon: typeof CircleDollarSign;
  rows: ArrearRow[];
  dateLabel: string;
  dateValue: string;
  onSaveDate?: (date: string) => Promise<void>;
  billDates?: string[];
  onSaveBillDates?: (dates: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(dateValue);
  const [draftBillDates, setDraftBillDates] = useState<string[]>(billDates ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftDate(dateValue);
      setDraftBillDates(billDates ?? []);
    }
  }, [dateValue, billDates, editing]);

  const startEdit = () => {
    setDraftDate(dateValue);
    setDraftBillDates(billDates ?? rows.map((r) => r.dueDate?.slice(0, 10) ?? ''));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (kind === 'bill') {
        await onSaveBillDates?.(draftBillDates);
      } else {
        await onSaveDate?.(draftDate);
      }
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm">
      <div className="border-b px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
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
          {!editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={startEdit}
            >
              <Pencil className="size-3" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3 border-b px-3 py-3">
          {kind === 'bill' ? (
            rows.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Add bills when creating the case to set due dates here.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={`bill-date-${index}`} className="space-y-1">
                    <Label className="text-xs">{row.name} — due date</Label>
                    <Input
                      type="date"
                      value={draftBillDates[index] ?? ''}
                      onChange={(e) =>
                        setDraftBillDates((prev) => {
                          const next = [...prev];
                          next[index] = e.target.value;
                          return next;
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">{dateLabel}</Label>
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                disabled={saving}
              />
              <p className="text-muted-foreground text-[11px]">
                {kind === 'rent'
                  ? 'Days overdue = today minus last rent paid to.'
                  : kind === 'bond'
                    ? 'Days overdue = today minus agreement end (once vacated).'
                    : 'Days overdue update automatically from this date.'}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || (kind === 'bill' && rows.length === 0)}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground px-3 py-6 text-center text-xs">{empty}</p>
      ) : (
        <div className="max-h-[min(70vh,640px)] flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[220px] border-collapse text-left text-sm">
            <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={`${row.kind}-${row.name}-${index}`}>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-medium leading-snug">{row.name}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums font-medium">
                    {row.amount != null ? formatCurrency(row.amount) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top">
                    <DaysSince
                      kind={kind}
                      dueDate={row.dueDate}
                      fallbackDays={row.daysOverdue}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TribunalRentChasingDetail({ caseId }: { caseId: string }) {
  const { properties } = useAgentData();
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

  const property = useMemo(
    () => properties.find((p) => p.id === detail?.propertyId) ?? null,
    [properties, detail?.propertyId],
  );

  const tenantName =
    detail?.tenantName?.trim() ||
    (property?.tenantName && property.tenantName !== '—'
      ? property.tenantName
      : '') ||
    '';
  const tenantPhone =
    detail?.tenantPhone?.trim() || property?.tenantContact?.phone?.trim() || '';
  const tenantEmail =
    detail?.tenantEmail?.trim() || property?.tenantContact?.email?.trim() || '';
  const leaseStart =
    detail?.leaseStart?.slice(0, 10) || property?.leaseStart?.slice(0, 10) || '';
  const agreementEnd =
    detail?.agreementEnd?.slice(0, 10) ||
    property?.leaseEnd?.slice(0, 10) ||
    '';

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

  const saveRentPaidTo = async (date: string) => {
    const next = await updateAgentTribunalRentChasing(caseId, {
      rentArrears: { rentPaidTo: date.trim() || undefined },
    });
    setDetail(next);
    toast.success('Rent paid-to updated');
  };

  const saveAgreementEnd = async (date: string) => {
    const next = await updateAgentTribunalRentChasing(caseId, {
      bondArrears: { agreementEndDate: date.trim() || undefined },
    });
    setDetail(next);
    toast.success('Agreement end updated');
  };

  const saveBillDueDates = async (dates: string[]) => {
    const bills = arrearsByKind.bill;
    const next = await updateAgentTribunalRentChasing(caseId, {
      billArrears: bills.map((row, index) => ({
        billType: row.name,
        billName: row.name,
        dueDate: dates[index]?.trim() || undefined,
        amount: row.amount ?? undefined,
      })),
    });
    setDetail(next);
    toast.success('Bill due dates updated');
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
              {tenantName ? ` · ${tenantName}` : ''}
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

      <section className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Tenancy details
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Tenant
            </dt>
            <dd className="mt-1 text-sm font-medium">{tenantName || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Contact
            </dt>
            <dd className="mt-1 text-sm font-medium">{tenantPhone || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Email
            </dt>
            <dd className="mt-1 text-sm font-medium break-all">{tenantEmail || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Lease start
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {leaseStart ? formatDate(leaseStart) : '—'}
            </dd>
          </div>
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
        <ArrearsSection
          kind="rent"
          title="Rent Arrears"
          empty="No rent arrears recorded on this case."
          icon={CircleDollarSign}
          rows={arrearsByKind.rent}
          dateLabel="Last rent paid to"
          dateValue={detail.rentPaidTo?.slice(0, 10) ?? ''}
          onSaveDate={saveRentPaidTo}
        />
        <ArrearsSection
          kind="bill"
          title="Bill Arrears"
          empty="No bill arrears recorded on this case."
          icon={Receipt}
          rows={arrearsByKind.bill}
          dateLabel="Due date"
          dateValue=""
          billDates={arrearsByKind.bill.map((r) => r.dueDate?.slice(0, 10) ?? '')}
          onSaveBillDates={saveBillDueDates}
        />
        <ArrearsSection
          kind="bond"
          title="Bond Arrears"
          empty="No bond arrears recorded on this case."
          icon={FileText}
          rows={arrearsByKind.bond}
          dateLabel="Agreement end"
          dateValue={agreementEnd}
          onSaveDate={saveAgreementEnd}
        />
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
