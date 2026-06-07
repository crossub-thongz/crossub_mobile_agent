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
  const { tenantSelections } = useAgentData();

  return (
    <AgentShell title="Tenant selection" backHref={ROUTES.LEASING}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Applicants awaiting your approval after CROSSUB shortlisting.
        </p>
        {tenantSelections.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No pending applications"
            description="When a tenant is shortlisted for your properties, they'll appear here."
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
                    <p className="truncate text-sm font-semibold">{t.propertyAddress}</p>
                    <p className="text-sm">{t.applicantName}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatCurrency(t.proposedRent)}/wk · {t.leaseTerm}
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
