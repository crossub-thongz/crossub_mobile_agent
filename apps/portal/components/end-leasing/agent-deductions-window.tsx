'use client';

import { useEffect, useState } from 'react';
import { Loader2, Receipt } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  AGENT_DEDUCTION_GROUP_LABEL,
  AGENT_DEDUCTION_GROUP_ORDER,
  AGENT_DEDUCTION_NOTE_MAX,
  TERMINATION_CASE_STATUS,
  type AgentDeductionGroup,
} from '@/constants/end-leasing';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type Draft = Record<AgentDeductionGroup, string>;

function emptyDraft(): Draft {
  return Object.fromEntries(AGENT_DEDUCTION_GROUP_ORDER.map((group) => [group, ''])) as Draft;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.replace(/[$,\s]/g, '');
  if (!trimmed) return 0;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

/**
 * Daniel Zhou, 27 Sep 2026: "just do a window on agent side and text box for them to key in —
 * an AM can skip / key in by themself." Shown when CROSSUB has asked, or once the agent has keyed
 * something in. CROSSUB turns the figures into the final statement; until it does, the agent can
 * revise them.
 */
export function AgentDeductionsWindow({ caseData }: { caseData: TerminationCaseDetail }) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const { request, submission } = caseData.agentDeductions;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = emptyDraft();
    for (const line of submission?.lines ?? []) next[line.group] = line.amount ? String(line.amount) : '';
    setDraft(next);
    setNote(submission?.note ?? '');
  }, [open, submission]);

  const settled =
    caseData.settlement.status === LEASING_ITEM_STATUS.DONE || caseData.status !== TERMINATION_CASE_STATUS.OPEN;
  if ((!request && !submission) || (settled && !submission)) return null;

  const applied = Boolean(submission?.appliedAt);
  const canEdit = !settled && !applied;
  const amounts = AGENT_DEDUCTION_GROUP_ORDER.map((group) => ({ group, value: parseAmount(draft[group]) }));
  const invalid = amounts.some((a) => a.value === null);
  const total = amounts.reduce((sum, a) => sum + (a.value ?? 0), 0);
  const submittedTotal = submission?.lines.reduce((sum, l) => sum + l.amount, 0) ?? 0;

  const submit = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.submitAgentDeductions(caseData.id, {
        lines: amounts.map((a) => ({ group: a.group, amount: a.value ?? 0 })),
        note: note.trim() || undefined,
      });
      applyCase(updated);
      toast.success('Deduction details sent to CROSSUB');
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/12 text-orange-700">
            <Receipt className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Tenant deductions</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {submission
                ? applied
                  ? `CROSSUB added your figures to the final statement${submission.appliedAt ? ` on ${formatDate(submission.appliedAt)}` : ''}.`
                  : `You sent ${formatCurrency(submittedTotal)} on ${formatDateTime(submission.submittedAt)}. CROSSUB will add it to the final statement.`
                : `CROSSUB asked you on ${formatDate(request!.requestedAt)} to key in the tenant's end-of-lease deductions.`}
            </p>
            {request?.note && !submission ? (
              <p className="mt-2 text-xs">&ldquo;{request.note}&rdquo;</p>
            ) : null}
          </div>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            {submission ? 'Edit deductions' : 'Key in deductions'}
          </Button>
        ) : null}
      </div>

      {submission ? (
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {AGENT_DEDUCTION_GROUP_ORDER.map((group) => (
            <div key={group} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{AGENT_DEDUCTION_GROUP_LABEL[group]}</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(submission.lines.find((l) => l.group === group)?.amount ?? 0)}
              </dd>
            </div>
          ))}
          {submission.note ? (
            <p className="text-muted-foreground col-span-full mt-2 whitespace-pre-wrap">{submission.note}</p>
          ) : null}
        </dl>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Key in the tenant&apos;s deductions</DialogTitle>
            <DialogDescription>
              Amounts ex. GST. Leave a row empty when there is nothing to charge, and explain anything
              CROSSUB should know in the notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {AGENT_DEDUCTION_GROUP_ORDER.map((group) => (
              <div key={group} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
                <Label htmlFor={`agent-deduction-${group}`}>{AGENT_DEDUCTION_GROUP_LABEL[group]}</Label>
                <Input
                  id={`agent-deduction-${group}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={draft[group]}
                  onChange={(e) => setDraft((d) => ({ ...d, [group]: e.target.value }))}
                  className="text-right tabular-nums"
                />
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-deduction-note">Notes</Label>
              <Textarea
                id="agent-deduction-note"
                value={note}
                rows={4}
                maxLength={AGENT_DEDUCTION_NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Cleaning $650 per Brightness AU invoice; carpet repair $220."
              />
            </div>
            {invalid ? <p className="text-destructive text-xs">Amounts must be numbers of 0 or more.</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy || invalid || (total === 0 && !note.trim())}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Send to CROSSUB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
