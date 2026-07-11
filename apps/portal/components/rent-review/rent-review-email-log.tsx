'use client';

import Link from 'next/link';
import { ExternalLink, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { communicationsThread } from '@/constants/routes';
import type { RentReviewEmailRecord } from '@/lib/rent-review/agent-workflow-model';
import { formatDateTime } from '@/lib/utils';

export function RentReviewEmailLog({
  title,
  emails,
}: {
  title: string;
  emails: RentReviewEmailRecord[];
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
        <div key={email.id} className="rounded-xl border bg-card p-3 space-y-2">
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

export function RentReviewEmailRecordPanel({ email }: { email: RentReviewEmailRecord }) {
  return <RentReviewEmailLog title="Email record" emails={[email]} />;
}
