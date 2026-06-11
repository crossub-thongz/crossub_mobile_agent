'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Gavel } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PageIntro } from '@/components/agent/page-intro';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, tribunalDetail } from '@/constants/routes';
import { formatDateTime } from '@/lib/utils';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

export default function TribunalPage() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { tribunalCases } = useAgentData();
  const [filter, setFilter] = useState(() => {
    if (urlFilter === 'closed') return 'closed';
    if (urlFilter === 'all') return 'all';
    return 'active';
  });

  const list = useMemo(() => {
    if (filter === 'all') return tribunalCases;
    return tribunalCases.filter((c) => c.status === filter);
  }, [tribunalCases, filter]);

  return (
    <AgentShell title="Tribunal" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro description="Standalone tribunal matters — hearings, evidence, and orders." />

        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {list.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No tribunal cases"
            description="Active and closed QCAT matters will appear here."
          />
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <Link
                key={c.id}
                href={tribunalDetail(c.id)}
                className="block rounded-2xl border bg-card p-4 transition hover:border-primary/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap gap-2">
                      {c.requiresAction && c.status === 'active' && (
                        <StatusBadge label="Action required" variant="approval" />
                      )}
                      <StatusBadge
                        label={c.status}
                        variant={c.status === 'active' ? 'approval' : 'success'}
                      />
                    </div>
                    <p className="text-sm font-semibold">{c.propertyAddress}</p>
                    <p className="text-muted-foreground text-xs">{c.tenantName}</p>
                    <p className="text-sm">{c.matter}</p>
                    {c.hearingDate && (
                      <p className="text-muted-foreground text-xs">
                        Hearing {formatDateTime(c.hearingDate)}
                      </p>
                    )}
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
