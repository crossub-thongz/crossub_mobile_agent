'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { GII_PROPOSAL_COPY, GII_PROPOSAL_EMAIL_LABEL } from '@/constants/gii-proposal';
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
  /** An email's full text waits behind Preview email, so the card stays short until asked. */
  const email = proposal.lines.find((line) => line.label === GII_PROPOSAL_EMAIL_LABEL) ?? null;
  const rows = proposal.lines.filter((line) => line !== email);
  const [emailOpen, setEmailOpen] = useState(false);
  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-3 py-2">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {GII_PROPOSAL_COPY.EYEBROW}
        </p>
        <p className="text-sm font-semibold">{proposal.title}</p>
      </div>
      <dl className="space-y-1.5 px-3 py-2">
        {rows.map((line) => (
          <div key={line.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="text-muted-foreground text-xs">{line.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-xs">{line.value}</dd>
          </div>
        ))}
      </dl>
      {email ? (
        <div className="px-3 pb-2">
          {emailOpen ? (
            <div className="bg-muted/40 mb-2 max-h-72 overflow-y-auto rounded-lg border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words">
              {email.value}
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-expanded={emailOpen}
            onClick={() => setEmailOpen((open) => !open)}
          >
            <Mail className="size-3.5" />
            {emailOpen ? GII_PROPOSAL_COPY.HIDE_EMAIL : GII_PROPOSAL_COPY.PREVIEW_EMAIL}
          </Button>
        </div>
      ) : null}
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
