'use client';

import { useEffect, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { toast } from 'sonner';

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
  DEDUCTION_RESPONSIBILITY,
  SELF_MANAGED_SETTLEMENT_COPY,
  SELF_MANAGED_SETTLEMENT_GROUP_LABEL,
  SELF_MANAGED_SETTLEMENT_GROUP_ORDER,
  TERMINATION_CASE_STATUS,
  type SelfManagedSettlementGroup,
} from '@/constants/end-leasing';
import {
  confirmSelfManagedSettlement,
  editSelfManagedSettlement,
  type SelfManagedSettlementBreakdownInput,
} from '@/lib/crossub-api/agent-end-leasing-client';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type Draft = Record<SelfManagedSettlementGroup | 'bondHeld', string>;

const DRAFT_KEYS: Array<SelfManagedSettlementGroup | 'bondHeld'> = ['bondHeld', ...SELF_MANAGED_SETTLEMENT_GROUP_ORDER];

function emptyDraft(): Draft {
  return Object.fromEntries(DRAFT_KEYS.map((key) => [key, ''])) as Draft;
}

/** Blank → undefined (keep as is); a number of 0 or more → that amount; anything else → NaN. */
function parseAmount(raw: string): number | undefined {
  const trimmed = raw.replace(/[$,\s]/g, '');
  if (!trimmed) return undefined;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : Number.NaN;
}

/**
 * Self-Manage end of lease (Phase 2): the agent sets the bond held and the tenant's deductions,
 * then confirms the settlement — finalise and approve in one step, the steps CROSSUB runs on the
 * other plans. Replaces the "key in when CROSSUB asks" window on Self-Manage properties.
 */
export function SelfManagedSettlementPanel({ caseData }: { caseData: TerminationCaseDetail }) {
  const refreshCase = useEndLeasingStore((s) => s.refreshCase);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editOpen) setDraft(emptyDraft());
  }, [editOpen]);

  const { settlement } = caseData;
  const open = caseData.status === TERMINATION_CASE_STATUS.OPEN;
  const confirmed = settlement.status === LEASING_ITEM_STATUS.DONE;
  const canEdit = open && !confirmed;
  const tenantLines = settlement.deductions.filter((line) => line.responsibility === DEDUCTION_RESPONSIBILITY.TENANT && line.amount > 0);

  const parsed = DRAFT_KEYS.map((key) => ({ key, value: parseAmount(draft[key]) }));
  const invalid = parsed.some((p) => Number.isNaN(p.value));
  const changes = parsed.filter((p) => p.value !== undefined);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await refreshCase(caseData.id);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const body = Object.fromEntries(changes.map((c) => [c.key, c.value])) as SelfManagedSettlementBreakdownInput;
    if (await run(() => editSelfManagedSettlement(caseData.id, body), SELF_MANAGED_SETTLEMENT_COPY.saved)) {
      setEditOpen(false);
    }
  };

  const confirm = async () => {
    if (await run(() => confirmSelfManagedSettlement(caseData.id), SELF_MANAGED_SETTLEMENT_COPY.confirmedToast)) {
      setConfirmOpen(false);
    }
  };

  return (
    <section className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/12 text-orange-700">
            <Scale className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{SELF_MANAGED_SETTLEMENT_COPY.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {confirmed ? SELF_MANAGED_SETTLEMENT_COPY.confirmed : SELF_MANAGED_SETTLEMENT_COPY.intro}
            </p>
          </div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={busy}>
              Edit deductions
            </Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
              Confirm settlement
            </Button>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Bond held</dt>
          <dd className="font-medium tabular-nums">{formatCurrency(settlement.bondHeld)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Total deductions</dt>
          <dd className="font-medium tabular-nums">{formatCurrency(settlement.totalDeductions)}</dd>
        </div>
        {settlement.debtAmount > 0 ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Owed by the tenant</dt>
            <dd className="font-medium tabular-nums text-red-700">{formatCurrency(settlement.debtAmount)}</dd>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Refund to the tenant</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(settlement.refundAmount)}</dd>
          </div>
        )}
      </dl>

      <ul className="mt-3 space-y-1 border-t pt-3 text-xs">
        {tenantLines.length === 0 ? (
          <li className="text-muted-foreground">{SELF_MANAGED_SETTLEMENT_COPY.noDeductions}</li>
        ) : (
          tenantLines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3">
              <span>{line.category}</span>
              <span className="font-medium tabular-nums">{formatCurrency(line.amount)}</span>
            </li>
          ))
        )}
      </ul>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{SELF_MANAGED_SETTLEMENT_COPY.editTitle}</DialogTitle>
            <DialogDescription>{SELF_MANAGED_SETTLEMENT_COPY.editHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {DRAFT_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
                <Label htmlFor={`self-managed-settlement-${key}`}>
                  {key === 'bondHeld' ? 'Bond held' : SELF_MANAGED_SETTLEMENT_GROUP_LABEL[key]}
                </Label>
                <Input
                  id={`self-managed-settlement-${key}`}
                  inputMode="decimal"
                  placeholder={key === 'bondHeld' ? String(settlement.bondHeld) : '—'}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  className="text-right tabular-nums"
                />
              </div>
            ))}
            {invalid ? <p className="text-destructive text-xs">Amounts must be numbers of 0 or more.</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || invalid || changes.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{SELF_MANAGED_SETTLEMENT_COPY.confirmTitle}</DialogTitle>
            <DialogDescription>{SELF_MANAGED_SETTLEMENT_COPY.confirmBody}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {formatCurrency(settlement.totalDeductions)} in deductions from a {formatCurrency(settlement.bondHeld)} bond.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
