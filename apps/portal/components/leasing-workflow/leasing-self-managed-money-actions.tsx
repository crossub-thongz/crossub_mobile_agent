'use client';

import { useState } from 'react';
import { CircleCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ONBOARDING_MONEY_ITEM,
  SELF_MANAGED_LEASING_COPY as LETTING_COPY,
  SELF_MANAGED_MONEY_COPY as COPY,
  type OnboardingMoneyItem,
} from '@/constants/self-managed-leasing';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import {
  approveSelfManagedBondProof,
  approveSelfManagedDepositProof,
  markSelfManagedBondPaid,
  markSelfManagedDepositPaid,
  rejectSelfManagedBondProof,
  rejectSelfManagedDepositProof,
  type RejectOnboardingProofInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_ITEM_STATUS, LEASING_UI, type LeasingItemStatus } from '@/lib/leasing/constants';
import { cn } from '@/lib/utils';

const ACTION = {
  MARK_PAID: 'mark-paid',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

type MoneyCalls = {
  markPaid: (propertyId: string, cycleId: string) => Promise<unknown>;
  approve: (propertyId: string, cycleId: string) => Promise<unknown>;
  reject: (propertyId: string, cycleId: string, body: RejectOnboardingProofInput) => Promise<unknown>;
};

const MONEY_CALLS: Record<OnboardingMoneyItem, MoneyCalls> = {
  [ONBOARDING_MONEY_ITEM.DEPOSIT]: {
    markPaid: markSelfManagedDepositPaid,
    approve: approveSelfManagedDepositProof,
    reject: rejectSelfManagedDepositProof,
  },
  [ONBOARDING_MONEY_ITEM.BOND]: {
    markPaid: markSelfManagedBondPaid,
    approve: approveSelfManagedBondProof,
    reject: rejectSelfManagedBondProof,
  },
};

/**
 * Self-Manage money step for the holding deposit or the bond: approve or reject the proof the
 * tenant uploaded, or mark it received when it was paid outside the app (posts the receipt to
 * the property ledger). Nothing once the item is done.
 */
export function LeasingSelfManagedMoneyActions({
  item,
  propertyId,
  cycleId,
  status,
  proofPending,
}: {
  item: OnboardingMoneyItem;
  propertyId: string;
  cycleId?: string;
  status: LeasingItemStatus;
  /** The tenant uploaded proof and it is waiting for review. */
  proofPending: boolean;
}) {
  const { pending, run } = useSelfManagedLettingAction(propertyId, cycleId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (status === LEASING_ITEM_STATUS.DONE) return null;

  const copy = COPY[item];
  const calls = MONEY_CALLS[item];
  const busy = pending !== null;

  const reject = async () => {
    const trimmed = reason.trim();
    const ok = await run(
      ACTION.REJECT,
      (id) => calls.reject(propertyId, id, { reason: trimmed || undefined }),
      copy.rejected,
    );
    if (ok) {
      setReason('');
      setRejecting(false);
    }
  };

  if (!proofPending) {
    return (
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[12px]">{copy.markPaidHint}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('h-8 gap-1 text-xs', LEASING_UI.btnSecondary)}
          disabled={busy}
          onClick={() =>
            void run(ACTION.MARK_PAID, (id) => calls.markPaid(propertyId, id), copy.markedPaid)
          }
        >
          <CircleCheck className="size-3.5" />
          {pending === ACTION.MARK_PAID ? LETTING_COPY.saving : copy.markPaid}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 flex-1 text-xs"
          disabled={busy}
          onClick={() =>
            void run(ACTION.APPROVE, (id) => calls.approve(propertyId, id), copy.approved)
          }
        >
          {pending === ACTION.APPROVE ? LETTING_COPY.saving : copy.approve}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1 text-xs"
          disabled={busy}
          onClick={() => setRejecting((value) => !value)}
          aria-expanded={rejecting}
        >
          {COPY.reject}
        </Button>
      </div>
      {rejecting ? (
        <div className="space-y-1.5 border-t pt-2">
          <Label htmlFor={`${item}-reject-reason`} className="text-xs">
            {COPY.rejectReason}
          </Label>
          <Input
            id={`${item}-reject-reason`}
            value={reason}
            maxLength={500}
            placeholder={COPY.rejectReasonPlaceholder}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => void reject()}
            >
              {pending === ACTION.REJECT ? LETTING_COPY.sending : COPY.confirmReject}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => setRejecting(false)}
            >
              {LETTING_COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
