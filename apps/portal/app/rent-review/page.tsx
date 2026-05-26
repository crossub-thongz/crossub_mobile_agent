'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { rentReviewDetail } from '@/constants/routes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAgentStore } from '@/lib/store';

export default function RentReviewPage() {
  const { rentReviews } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);

  return (
    <AgentShell title="Rent Review">
      <div className="space-y-2">
        {rentReviews.map((r) => (
          <Link
            key={r.id}
            href={rentReviewDetail(r.id)}
            className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  {r.requiresApproval && !decisions[r.id] && (
                    <StatusBadge label="Action required" variant="approval" />
                  )}
                  {r.tenantResponse === 'counter' && (
                    <StatusBadge label="Counter offer" priority="high" />
                  )}
                  <StatusBadge label={r.status} />
                </div>
                <p className="text-sm font-semibold">{r.propertyAddress}</p>
                <p className="text-muted-foreground text-xs">
                  Current {formatCurrency(r.currentRent)}/wk → suggested{' '}
                  {formatCurrency(r.suggestedRent)}/wk
                </p>
                <p className="text-muted-foreground text-xs">
                  Review due {formatDate(r.reviewDue)}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </AgentShell>
  );
}
