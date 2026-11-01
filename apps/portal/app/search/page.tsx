'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import { searchAgentRecords } from '@/lib/agent-global-search';

export default function SearchPage() {
  const params = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [q, setQ] = useState(initialQuery);
  const data = useAgentData();

  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  const results = useMemo(
    () =>
      searchAgentRecords(q, {
        properties: data.properties ?? [],
        maintenanceAll: data.maintenanceAll ?? [],
        inspections: data.inspections ?? [],
        rentReviews: data.rentReviews ?? [],
        vacating: data.vacating ?? [],
        tenantSelections: data.tenantSelections ?? [],
      }),
    [q, data.properties, data.maintenanceAll, data.inspections, data.rentReviews, data.vacating, data.tenantSelections],
  );

  return (
    <AgentShell title="Global search" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            placeholder="Address, tenant, task #, contractor…"
            className="pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Searches properties, maintenance (incl. crossub_web API), inspections,
          rent review, vacating, and tenant applications.
        </p>
        <div className="space-y-2">
          {results.map((r, i) => (
            <Link
              key={`${r.href}-${i}`}
              href={r.href}
              className="block rounded-xl border bg-card px-4 py-3 active:bg-secondary/50"
            >
              <p className="text-muted-foreground text-[11px] uppercase">{r.kind}</p>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-muted-foreground text-xs">{r.sub}</p>
            </Link>
          ))}
          {q.trim() && results.length === 0 && (
            <p className="text-muted-foreground text-sm">No results.</p>
          )}
        </div>
      </div>
    </AgentShell>
  );
}
