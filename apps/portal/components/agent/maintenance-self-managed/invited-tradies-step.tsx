'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  fetchAgentMaintenanceDetail,
  issueMaintenanceQuoteFormLink,
  type AgentMaintenanceContractorRef,
  type MaintenanceQuoteFormLink,
} from '@/lib/crossub-api/maintenance-client';
import { removeAwaitingQuoteContractor } from '@/lib/maintenance/maintenance-case-ops';
import { formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * The tradies asked to quote: copy one their own quote-form link (to text or email it yourself),
 * or stop asking one who has not quoted yet. The server refuses a withdraw once they answered.
 */
export function InvitedTradiesStep({
  requestId,
  invited,
  quotedNames,
  status,
  hasSubmittedQuote,
  busy,
  run,
}: {
  requestId: string;
  invited: readonly AgentMaintenanceContractorRef[];
  /** Names on the quotes in so far; a tradie who quoted can no longer be withdrawn. */
  quotedNames: ReadonlySet<string>;
  /** Job status while quotes are still being collected. */
  status: string;
  /** A supplier has already sent a quote that can go to approval. */
  hasSubmittedQuote: boolean;
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [link, setLink] = useState<MaintenanceQuoteFormLink | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const copyLink = async (contractorId: string) => {
    setLinking(contractorId);
    try {
      // send: false — the agent passes the link on; re-emailing the request is the invite step's job.
      const minted = await issueMaintenanceQuoteFormLink(requestId, { contractorId, send: false });
      setLinkFor(contractorId);
      setLink(minted);
      try {
        await navigator.clipboard.writeText(minted.url);
        toast.success(COPY.quoteLinkCopied);
      } catch {
        toast.error(COPY.quoteLinkCopyFailed);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLinking(null);
    }
  };

  const withdraw = (contractor: AgentMaintenanceContractorRef) => {
    if (!window.confirm(COPY.withdrawConfirm(contractor.name))) return;
    const anotherAwaiting = invited.some(
      (row) => row.id !== contractor.id && !quotedNames.has(row.name),
    );
    void run(async () => {
      await removeAwaitingQuoteContractor({
        requestId,
        contractorId: contractor.id,
        status,
        quoteAlreadyIn: hasSubmittedQuote,
        anotherContractorStillAwaiting: anotherAwaiting,
      });
      return fetchAgentMaintenanceDetail(requestId);
    }, COPY.tradieWithdrawn);
  };

  return (
    <StepCard title={COPY.invitedTitle}>
      <ul className="space-y-2">
        {invited.map((contractor) => (
          <li key={contractor.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium">{contractor.name}</span>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={busy || linking !== null}
                  onClick={() => void copyLink(contractor.id)}
                >
                  {COPY.copyQuoteLink}
                </Button>
                {quotedNames.has(contractor.name) ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={busy || linking !== null}
                    onClick={() => withdraw(contractor)}
                  >
                    {COPY.withdrawTradie}
                  </Button>
                )}
              </div>
            </div>
            {linkFor === contractor.id && link ? (
              <div className="space-y-1">
                <Input
                  readOnly
                  aria-label={COPY.quoteLinkReady}
                  className="h-8 text-xs"
                  value={link.url}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <p className="text-muted-foreground text-[11px]">
                  {COPY.quoteLinkExpires(formatDateTime(link.expiresAt))}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </StepCard>
  );
}
