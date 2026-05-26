'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { VACATING } from '@/lib/mock-data';
import { vacatingDetail } from '@/constants/routes';
import { formatDate } from '@/lib/utils';

export default function VacatingPage() {
  return (
    <AgentShell title="Vacating">
      <div className="space-y-2">
        {VACATING.map((v) => (
          <Link
            key={v.id}
            href={vacatingDetail(v.id)}
            className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <StatusBadge label={`${v.checklistProgress}% complete`} />
                <p className="text-sm font-semibold">{v.propertyAddress}</p>
                <p className="text-muted-foreground text-xs">
                  Vacate {formatDate(v.vacateDate)} · {v.reason}
                </p>
                <p className="text-muted-foreground text-xs">
                  Bond: {v.bondStatus} · Outgoing: {v.outgoingInspectionStatus}
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
