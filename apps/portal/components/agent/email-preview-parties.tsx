'use client';

import {
  formatEmailPartyPreview,
  type WorkflowEmailContact,
} from '@/lib/job-case-email-recipients';

export function EmailPreviewParties({
  from,
  fromEmail,
  to,
  toEmail,
  contacts = [],
  className,
}: {
  from: string;
  fromEmail?: string;
  to: string;
  toEmail?: string;
  contacts?: WorkflowEmailContact[];
  className?: string;
}) {
  return (
    <dl className={className ?? 'grid gap-2 text-xs sm:grid-cols-1'}>
      <div>
        <dt className="text-muted-foreground">From</dt>
        <dd className="font-medium break-words">
          {formatEmailPartyPreview(from, fromEmail, contacts)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">To</dt>
        <dd className="font-medium break-words">
          {formatEmailPartyPreview(to, toEmail, contacts)}
        </dd>
      </div>
    </dl>
  );
}
