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
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { EvictionRequiredDialog } from '@/components/agent/eviction-required-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { TRIBUNAL_CASE_STATUS } from '@/constants/api-enums';
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
  formatPropertyFullAddress,
} from '@/lib/utils';

type ArrearRow = AgentTribunalRentChasingDetail['arrears'][number];
type ArrearKind = ArrearRow['kind'];

type DraftBill = {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
};

function newDraftBill(): DraftBill {
  return {
    id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    amount: '',
    dueDate: '',
  };
}

function draftsFromBillRows(rows: ArrearRow[]): DraftBill[] {
  return rows.map((row, index) => ({
    id: `existing-${index}-${row.name}`,
    name: row.name,
    amount: row.amount != null ? String(row.amount) : '',
    dueDate: row.dueDate?.slice(0, 10) ?? '',
  }));
}

function cycleLabel(cycle: string | null | undefined): string {
  if (cycle === 'fortnightly') return 'Fortnightly';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'weekly') return 'Weekly';
  return '—';
}

function tribunalStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case TRIBUNAL_CASE_STATUS.DRAFT:
      return 'Draft';
    case TRIBUNAL_CASE_STATUS.SUBMITTED:
      return 'Submitted';
    case TRIBUNAL_CASE_STATUS.AWAITING_HEARING:
      return 'Awaiting hearing';
    case TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED:
      return 'Hearing scheduled';
    case TRIBUNAL_CASE_STATUS.COMPLETED:
      return 'Completed';
    case TRIBUNAL_CASE_STATUS.CLOSED:
      return 'Closed';
    default:
      return status?.trim() || '—';
  }
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
  onSaveBills,
}: {
  kind: ArrearKind;
  title: string;
  empty: string;
  icon: typeof CircleDollarSign;
  rows: ArrearRow[];
  dateLabel: string;
  dateValue: string;
  onSaveDate?: (date: string) => Promise<void>;
  onSaveBills?: (bills: DraftBill[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(dateValue);
  const [draftBills, setDraftBills] = useState<DraftBill[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftDate(dateValue);
      setDraftBills(draftsFromBillRows(rows));
    }
  }, [dateValue, rows, editing]);

  const startEdit = () => {
    setDraftDate(dateValue);
    setDraftBills(
      kind === 'bill' && rows.length === 0
        ? [newDraftBill()]
        : draftsFromBillRows(rows),
    );
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (kind === 'bill') {
        const incomplete = draftBills.some(
          (b) => !b.name.trim() && (b.amount.trim() || b.dueDate.trim()),
        );
        if (incomplete) {
          toast.error('Enter a bill name for each bill with an amount or due date');
          return;
        }
        await onSaveBills?.(draftBills);
      } else {
        await onSaveDate?.(draftDate);
      }
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update arrears');
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
            <div className="space-y-3">
              {draftBills.map((bill) => (
                <div
                  key={bill.id}
                  className="space-y-2 rounded-lg border bg-muted/20 p-2.5"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Bill name</Label>
                    <Input
                      value={bill.name}
                      onChange={(e) =>
                        setDraftBills((prev) =>
                          prev.map((b) =>
                            b.id === bill.id ? { ...b, name: e.target.value } : b,
                          ),
                        )
                      }
                      placeholder="e.g. Water rates"
                      disabled={saving}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={bill.amount}
                        onChange={(e) =>
                          setDraftBills((prev) =>
                            prev.map((b) =>
                              b.id === bill.id ? { ...b, amount: e.target.value } : b,
                            ),
                          )
                        }
                        placeholder="0.00"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-9 shrink-0"
                        onClick={() =>
                          setDraftBills((prev) => prev.filter((b) => b.id !== bill.id))
                        }
                        disabled={saving}
                        aria-label="Remove bill"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due date</Label>
                    <Input
                      type="date"
                      value={bill.dueDate}
                      onChange={(e) =>
                        setDraftBills((prev) =>
                          prev.map((b) =>
                            b.id === bill.id ? { ...b, dueDate: e.target.value } : b,
                          ),
                        )
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setDraftBills((prev) => [...prev, newDraftBill()])}
                disabled={saving}
              >
                <Plus className="size-3.5" />
                Add bill
              </Button>
            </div>
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
              disabled={saving}
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
  const { properties, refresh: refreshPortfolio } = useAgentData();
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
  const fullAddress = property
    ? formatPropertyFullAddress(property)
    : (detail?.propertyAddress ?? '');

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

  const saveBills = async (bills: DraftBill[]) => {
    const payload = bills
      .map((bill) => {
        const name = bill.name.trim();
        if (!name) return null;
        const amountRaw = bill.amount.trim();
        const amount = amountRaw === '' ? undefined : Number(amountRaw);
        if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
          throw new Error(`Enter a valid amount for “${name}”`);
        }
        return {
          billType: name,
          billName: name,
          dueDate: bill.dueDate.trim() || undefined,
          amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const next = await updateAgentTribunalRentChasing(caseId, {
      billArrears: payload,
    });
    setDetail(next);
    toast.success(payload.length > 0 ? 'Bill arrears updated' : 'Bill arrears cleared');
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

  const handleEvictionSaved = (next: AgentTribunalRentChasingDetail) => {
    setDetail(next);
    void refreshPortfolio({ force: true });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Rent Chasing
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug">
              {fullAddress || detail.propertyAddress}
            </h2>
            {tenantName ? (
              <p className="text-muted-foreground mt-1 text-xs">{tenantName}</p>
            ) : null}
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
        onSaved={handleEvictionSaved}
      />

      <section className="rounded-xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Tribunal details
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Case number
            </dt>
            <dd className="mt-1 text-sm font-medium">{detail.caseNumber || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Status
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {tribunalStatusLabel(detail.status)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Matter
            </dt>
            <dd className="mt-1 text-sm font-medium">{detail.matter || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Eviction required
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {detail.evictionRequired ? 'Yes' : 'No'}
            </dd>
          </div>
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
        </dl>
      </section>

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
          onSaveBills={saveBills}
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
{/* 
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
      ) : null} */}

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
