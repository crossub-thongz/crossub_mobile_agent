'use client';

import Link from 'next/link';
import { ExternalLink, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { communicationsThread } from '@/constants/routes';
import {
  breachStatusLabel,
  buildTenantNoticeEmailView,
  buildVacatingInfoReplyEmailView,
  leaseTypeLabel,
  type TenantNoticeEmailView,
} from '@/lib/end-leasing/agent-workflow-model';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function EmailRecordPanel({ title, email }: { title: string; email: TenantNoticeEmailView }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {email.commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Link href={communicationsThread(email.commConversationId)}>
              <ExternalLink className="size-3.5" />
              View in Message Center
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{email.from}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">To</dt>
            <dd className="font-medium">{email.to}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="font-medium">{email.subject}</dd>
          </div>
          {email.receivedAt ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatDateTime(email.receivedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{email.body}</pre>
      </div>
    </div>
  );
}

export function EndLeasingVacateConfirmedPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const vacateDate =
    caseData.vacate.expectedVacateDate ??
    caseData.vacateDate ??
    caseData.terminationNotice?.tenantVacateDate;
  const tenantNotice = buildTenantNoticeEmailView(caseData);
  const vacatingReply = buildVacatingInfoReplyEmailView(caseData);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Vacate details</p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Lease type</dt>
            <dd className="font-medium">{leaseTypeLabel(caseData)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lease end</dt>
            <dd className="font-medium">
              {caseData.leaseEndDate ? caseData.leaseEndDate.slice(0, 10) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bond amount</dt>
            <dd className="font-medium">{formatCurrency(caseData.bondHeld)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Breach status</dt>
            <dd className="font-medium">{breachStatusLabel(caseData)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Vacate date</dt>
            <dd className="font-medium">
              {vacateDate ? vacateDate.slice(0, 10) : 'Not confirmed'}
            </dd>
          </div>
        </dl>
      </section>

      <EmailRecordPanel title="Vacate notice from tenant" email={tenantNotice} />

      {vacatingReply ? (
        <EmailRecordPanel title="Vacating information reply to tenant" email={vacatingReply} />
      ) : (
        <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Vacating information reply will appear here once sent to the tenant.
        </div>
      )}
    </div>
  );
}
