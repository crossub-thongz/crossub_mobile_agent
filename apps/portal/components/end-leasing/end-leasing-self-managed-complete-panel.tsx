'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SELF_MANAGED_VACATING_COMPLETE_COPY as COPY,
  TENANT_SETTLEMENT_CONFIRMATION,
  TERMINATION_CASE_STATUS,
} from '@/constants/end-leasing';
import { completeSelfManagedVacating } from '@/lib/crossub-api/agent-end-leasing-client';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Self-Manage vacating's last step (Daniel, 26 Oct 2026): after Compare the agency completes the
 * case itself. No quote, confirm or bond steps, and no money is posted; the bond refund is Trust
 * work (the optional Bond settlement card stays above the rail).
 */
export function EndLeasingSelfManagedCompletePanel({ caseData }: { caseData: TerminationCaseDetail }) {
  const refreshCase = useEndLeasingStore((s) => s.refreshCase);
  const { refresh } = useAgentData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (caseData.status === TERMINATION_CASE_STATUS.COMPLETED) {
    return (
      <p className="text-primary flex items-center gap-2 text-sm font-medium">
        <Check className="size-4" />
        {COPY.completed}
      </p>
    );
  }

  const compareConfirmed = caseData.reportComparison?.agentAcknowledged === true;
  const open = caseData.status === TERMINATION_CASE_STATUS.OPEN;
  // Matches the API's 409: the tenant's acceptance refunds the bond and completes the case.
  const tenantAnswer = caseData.tenantConfirmation.status;
  const settlementPending =
    caseData.settlement.status === LEASING_ITEM_STATUS.DONE &&
    tenantAnswer !== TENANT_SETTLEMENT_CONFIRMATION.ACCEPTED &&
    tenantAnswer !== TENANT_SETTLEMENT_CONFIRMATION.DECLINED;
  const reason = !compareConfirmed
    ? COPY.compareFirst
    : settlementPending
      ? COPY.settlementPending
      : COPY.intro;

  const complete = async () => {
    setBusy(true);
    try {
      await completeSelfManagedVacating(caseData.id);
      await refreshCase(caseData.id);
      await refresh();
      toast.success(COPY.completedToast);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        {reason}
      </p>
      <Button
        type="button"
        size="sm"
        disabled={busy || !open || !compareConfirmed || settlementPending}
        onClick={() => setConfirmOpen(true)}
      >
        {COPY.button}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.confirmTitle}</DialogTitle>
            <DialogDescription>{COPY.confirmBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              {COPY.cancel}
            </Button>
            <Button onClick={() => void complete()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {COPY.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
