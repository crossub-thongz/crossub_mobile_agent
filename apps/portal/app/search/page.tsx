'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import {
  inspectionDetail,
  maintenanceDetail,
  propertyDetail,
  rentReviewDetail,
  tenantSelectionDetail,
  vacatingDetail,
} from '@/constants/routes';

type Result = { label: string; sub: string; href: string; kind: string };

export default function SearchPage() {
  const [q, setQ] = useState('');
  const data = useAgentData();

  const results = useMemo(() => {
    if (!q.trim()) return [] as Result[];
    const query = q.toLowerCase();
    const out: Result[] = [];

    for (const p of data.properties) {
      if (
        p.address.toLowerCase().includes(query) ||
        p.tenantName.toLowerCase().includes(query) ||
        p.suburb.toLowerCase().includes(query)
      ) {
        out.push({
          kind: 'Property',
          label: p.address,
          sub: p.tenantName,
          href: propertyDetail(p.id),
        });
      }
    }
    for (const m of data.maintenanceAll) {
      if (
        m.title.toLowerCase().includes(query) ||
        m.trackingNumber.toLowerCase().includes(query) ||
        m.propertyAddress.toLowerCase().includes(query) ||
        (m.contractorName?.toLowerCase().includes(query) ?? false)
      ) {
        out.push({
          kind: 'Maintenance',
          label: m.title,
          sub: m.trackingNumber,
          href: maintenanceDetail(m.id),
        });
      }
    }
    for (const i of data.inspections) {
      if (
        i.trackingNumber.toLowerCase().includes(query) ||
        i.propertyAddress.toLowerCase().includes(query)
      ) {
        out.push({
          kind: 'Inspection',
          label: i.trackingNumber,
          sub: i.type,
          href: inspectionDetail(i.id),
        });
      }
    }
    for (const r of data.rentReviews) {
      if (r.propertyAddress.toLowerCase().includes(query)) {
        out.push({
          kind: 'Rent review',
          label: r.propertyAddress,
          sub: r.status,
          href: rentReviewDetail(r.id),
        });
      }
    }
    for (const v of data.vacating) {
      if (v.propertyAddress.toLowerCase().includes(query)) {
        out.push({
          kind: 'Vacating',
          label: v.propertyAddress,
          sub: v.reason,
          href: vacatingDetail(v.id),
        });
      }
    }
    for (const t of data.tenantSelections) {
      if (
        t.applicantName.toLowerCase().includes(query) ||
        t.propertyAddress.toLowerCase().includes(query)
      ) {
        out.push({
          kind: 'Tenant selection',
          label: t.applicantName,
          sub: t.propertyAddress,
          href: tenantSelectionDetail(t.id),
        });
      }
    }
    return out;
  }, [q, data]);

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
              <p className="text-muted-foreground text-[10px] uppercase">{r.kind}</p>
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
