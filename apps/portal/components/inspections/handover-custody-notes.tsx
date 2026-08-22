'use client';

import { cn } from '@/lib/utils';

export type HandoverParty = 'tenant' | 'agent';

const PARTY_RE = /Handover(?: \([^)]+\))? with (tenant|agent)/i;

/** Party is stored in collect/return notes from the inspector handover form. */
export function parseHandoverPartyFromNotes(
  notes: string | null | undefined,
): HandoverParty | null {
  if (!notes) return null;
  const match = notes.match(PARTY_RE);
  return match ? (match[1].toLowerCase() as HandoverParty) : null;
}

export function HandoverPartyBadge({
  notes,
}: {
  notes: string | null | undefined;
}) {
  const party = parseHandoverPartyFromNotes(notes);
  if (!party) return null;
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        party === 'agent'
          ? 'border-sky-400/40 bg-sky-500/10 text-sky-800 dark:text-sky-300'
          : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
      )}
    >
      Handover with {party}
    </span>
  );
}

export function HandoverNotesBlock({ notes }: { notes: string | null | undefined }) {
  if (!notes?.trim()) return null;
  return (
    <div className="space-y-1.5">
      <HandoverPartyBadge notes={notes} />
      <p className="text-muted-foreground whitespace-pre-wrap text-xs">{notes}</p>
    </div>
  );
}
