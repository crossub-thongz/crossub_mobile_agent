'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Mail, Reply } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { JobCaseEmailRecord } from '@/lib/job-case-email';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

function emailDirection(email: JobCaseEmailRecord): 'inbound' | 'outbound' {
  const from = email.from.toLowerCase();
  if (email.kind === 'job_created' && from.includes('tenant')) return 'inbound';
  if (email.kind === 'tenant_notice' || email.kind === 'timeline_email') return 'inbound';
  if (from.includes('research@') || from.includes('crossub')) return 'inbound';
  return 'outbound';
}

function emailPartyLine(email: JobCaseEmailRecord): string {
  const direction = emailDirection(email);
  return direction === 'inbound' ? `From ${email.from}` : `To ${email.to}`;
}

function EmailListRow({
  email,
  selected,
  onSelect,
}: {
  email: JobCaseEmailRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const direction = emailDirection(email);
  const Icon = direction === 'inbound' ? Reply : Mail;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-muted/30',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          direction === 'inbound' ? 'bg-sky-500/15 text-sky-700' : 'bg-amber-500/15 text-amber-700',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{email.subject}</p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{emailPartyLine(email)}</p>
        <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">{formatDate(email.at)}</p>
      </div>
      <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
    </button>
  );
}

function EmailDetailDialog({
  email,
  open,
  onOpenChange,
}: {
  email: JobCaseEmailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent elevated className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-base leading-snug">{email.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">{formatDateTime(email.at)}</p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">From</dt>
              <dd className="font-medium">{email.from}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">{email.to}</dd>
            </div>
          </dl>
          <div className="rounded-xl border bg-muted/20 p-3">
            <pre className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {email.body}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JobCaseEmailLog({
  title = 'E-mail',
  emails,
}: {
  title?: string;
  emails: JobCaseEmailRecord[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...emails].sort((a, b) => b.at.localeCompare(a.at)),
    [emails],
  );
  const selected = sorted.find((email) => email.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          History
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
          No email records yet for this stage.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y">
            {sorted.map((email) => (
              <li key={email.id}>
                <EmailListRow
                  email={email}
                  selected={selectedId === email.id}
                  onSelect={() => setSelectedId(email.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <EmailDetailDialog
        email={selected}
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}

export function JobCaseStageEmailHistory({
  emails,
  title,
}: {
  emails: JobCaseEmailRecord[];
  title?: string;
}) {
  return (
    <section className="border-t pt-4">
      <JobCaseEmailLog emails={emails} title={title} />
    </section>
  );
}
