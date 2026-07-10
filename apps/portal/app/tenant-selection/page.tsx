'use client';

import Link from 'next/link';
import { ChevronRight, UserCheck } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, tenantSelectionDetail } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

export default function TenantSelectionListPage() {
  const { tenantSelections, apiConnected, apiError, loading, refresh } = useAgentData();

  return (
    <AgentShell title="Tenant selection" backHref={ROUTES.LEASING}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Applicants from the tenant app and CROSSUB leasing shortlist — loaded from{' '}
          <code className="text-xs">GET /api/v1/agent/portfolio</code> (staging).
        </p>

        {!loading && !apiConnected && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {apiError ?? 'Not connected to the API. Start crossub_web (pnpm dev:api) and retry.'}
            <button
              type="button"
              className="text-primary ml-2 font-medium underline"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </div>
        )}

        {tenantSelections.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No pending applications"
            description="When an applicant submits from the tenant app or is shortlisted in leasing, they'll appear here."
          />
        ) : (
          <div className="space-y-2">
            {tenantSelections.map((t) => (
              <Link
                key={t.id}
                href={tenantSelectionDetail(t.id)}
                className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    {t.requiresApproval && (
                      <StatusBadge label="Action required" variant="approval" />
                    )}
                    <p className="line-clamp-2 text-sm font-semibold">{t.propertyAddress}</p>
                    <p className="text-sm">{t.applicantName}</p>
                    <p className="text-muted-foreground text-xs">
                      {t.proposedRent > 0
                        ? `${formatCurrency(t.proposedRent)}/wk`
                        : 'Rent on application'}
                      {t.leaseTerm !== '—' ? ` · ${t.leaseTerm}` : ''}
                    </p>
                    <p className="text-primary text-xs font-medium">{t.status}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
