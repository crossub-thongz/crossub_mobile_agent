'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustDownloadButton,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
  TrustPill,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  AGENT_PENDING_MAIL_KIND,
  AGENT_PENDING_MAIL_STATUS,
  downloadAgentPendingMailPdf,
  fetchAgentPendingMail,
  sendAgentPendingMail,
  type AgentPendingMail,
  type AgentPendingMailStatus,
} from '@/lib/crossub-api/agent-pending-mail-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { cn } from '@/lib/utils';

const FILTER = {
  ALL: 'ALL',
  PENDING: AGENT_PENDING_MAIL_STATUS.PENDING,
  SENT: AGENT_PENDING_MAIL_STATUS.SENT,
  FAILED: AGENT_PENDING_MAIL_STATUS.FAILED,
} as const;
type MailFilter = (typeof FILTER)[keyof typeof FILTER];

const FILTERS: readonly { id: MailFilter; label: string }[] = [
  { id: FILTER.ALL, label: 'All' },
  { id: FILTER.PENDING, label: 'Pending' },
  { id: FILTER.SENT, label: 'Sent' },
  { id: FILTER.FAILED, label: 'Failed' },
];

const KIND_LABEL = {
  [AGENT_PENDING_MAIL_KIND.TENANT_RECEIPT]: 'Rent receipt',
  [AGENT_PENDING_MAIL_KIND.OWNER_STATEMENT]: 'Owner statement',
} as const;

const STATUS_LABEL: Record<AgentPendingMailStatus, string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
};

const STATUS_TONE: Record<AgentPendingMailStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  SENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-destructive/15 text-destructive',
};

function filenameFor(mail: AgentPendingMail): string {
  const base = mail.documentLabel.trim().replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${base || 'document'}.pdf`;
}

/** Receipts and owner statements for this trust account. Send is manual and leaves from the agency. */
export function TrustPendingMailTab({
  agencyId,
  bankAccountId,
}: {
  agencyId: string;
  bankAccountId: string;
}) {
  const [filter, setFilter] = useState<MailFilter>(FILTER.PENDING);
  const [page, setPage] = useState(1);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const status = filter === FILTER.ALL ? undefined : filter;
  const mail = useTrustResource(`${agencyId}:${bankAccountId}:${filter}:${page}`, () =>
    fetchAgentPendingMail(agencyId, bankAccountId, { status, page, pageSize: 20 }),
  );

  async function onSend(row: AgentPendingMail) {
    setSendingId(row.id);
    try {
      const saved = await sendAgentPendingMail(agencyId, bankAccountId, row.id);
      if (saved.status === AGENT_PENDING_MAIL_STATUS.SENT) {
        toast.success(saved.recipientEmail ? `Sent to ${saved.recipientEmail}` : 'Sent');
      } else {
        toast.error(saved.failureReason ?? "The email didn't send");
      }
      mail.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  }

  const items = mail.data?.items ?? [];
  const pageCount = mail.data ? Math.max(1, Math.ceil(mail.data.total / mail.data.pageSize)) : 1;

  return (
    <TrustPanel
      title="Pending mail"
      actions={
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
      }
    >
      <p className="text-muted-foreground mb-3 text-sm">
        Rent receipts go to the tenant. Owner statements go to the owner. Nothing sends until you press Send.
        {mail.data ? ` ${mail.data.pendingCount} waiting.` : ''}
      </p>
      {mail.error ? <TrustLoadError error={mail.error} onRetry={mail.reload} /> : null}
      {mail.loading && !mail.data ? <TrustLoading /> : null}
      {mail.data && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing here.</p>
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className={TRUST_TABLE_HEAD_CLASS}>Document</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>To</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>Status</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{row.documentLabel}</p>
                    <p className="text-muted-foreground text-xs">
                      {KIND_LABEL[row.kind]} · {row.summary}
                    </p>
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p>{row.recipientName ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">{row.recipientEmail ?? 'No email address'}</p>
                    {row.failureReason ? <p className="text-destructive text-xs">{row.failureReason}</p> : null}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <TrustPill className={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</TrustPill>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <TrustDownloadButton
                        label="PDF"
                        filename={filenameFor(row)}
                        fetchBlob={() => downloadAgentPendingMailPdf(agencyId, bankAccountId, row.id)}
                        failedMessage="Couldn't download the document"
                      />
                      {row.status !== AGENT_PENDING_MAIL_STATUS.SENT ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={sendingId === row.id}
                          onClick={() => void onSend(row)}
                        >
                          Send
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {mail.data && mail.data.total > mail.data.pageSize ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </TrustPanel>
  );
}
