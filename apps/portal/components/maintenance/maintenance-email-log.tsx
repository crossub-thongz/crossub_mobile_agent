'use client';

import { Mail } from 'lucide-react';

import type { MaintenanceEmailRecord } from '@/lib/maintenance/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function MaintenanceEmailLog({
  title,
  emails,
}: {
  title: string;
  emails: MaintenanceEmailRecord[];
}) {
  if (emails.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-xs">
        No email records yet for this stage.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="text-primary size-4" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {emails.map((email) => (
        <div key={email.id} className="rounded-xl border bg-card space-y-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">{email.subject}</p>
            <span className="text-muted-foreground text-[10px]">{formatDateTime(email.at)}</span>
          </div>
          <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">From</dt>
              <dd>{email.from}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">To</dt>
              <dd>{email.to}</dd>
            </div>
          </dl>
          <pre className="text-muted-foreground max-h-32 overflow-y-auto text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
            {email.body}
          </pre>
        </div>
      ))}
    </div>
  );
}
