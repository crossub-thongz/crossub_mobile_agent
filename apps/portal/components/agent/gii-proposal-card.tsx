'use client';

import { Button } from '@/components/ui/button';
import { GII_PROPOSAL_COPY } from '@/constants/gii-proposal';
import type { GiiProposal } from '@/lib/crossub-api/gii-client';

/**
 * A change Cros proposed and has not made. Rows are the server's, shown as given: they are
 * the exact details Confirm will run, so nothing here is reworded or recomputed.
 */
export function GiiProposalCard({
  proposal,
  busy,
  onConfirm,
  onCancel,
}: {
  proposal: GiiProposal;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-3 py-2">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {GII_PROPOSAL_COPY.EYEBROW}
        </p>
        <p className="text-sm font-semibold">{proposal.title}</p>
      </div>
      <dl className="space-y-1.5 px-3 py-2">
        {proposal.lines.map((line) => (
          <div key={line.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="text-muted-foreground text-xs">{line.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-xs">{line.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex justify-end gap-2 border-t px-3 py-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>
          {GII_PROPOSAL_COPY.CANCEL}
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={onConfirm}>
          {busy ? GII_PROPOSAL_COPY.CONFIRMING : GII_PROPOSAL_COPY.CONFIRM}
        </Button>
      </div>
    </div>
  );
}
