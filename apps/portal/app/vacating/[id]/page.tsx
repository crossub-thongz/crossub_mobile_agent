'use client';

import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function VacatingDetailPage() {
  const params = useParams();
  const { vacating } = useAgentData();
  const item = vacating.find((v) => v.id === params.id);

  if (!item) notFound();

  return (
    <AgentShell title="Vacating checklist" backHref={ROUTES.VACATING}>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-semibold">{item.propertyAddress}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Vacate {formatDate(item.vacateDate)} · {item.reason}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${item.checklistProgress}%` }}
            />
          </div>
        </div>

        {item.requiresApproval && (
          <ApprovalPanel
            title="Bond settlement approval"
            amount={item.bondBreakdown.reduce((s, r) => s + (r.label.includes('held') ? 0 : r.amount), 0)}
            recommendation="Review deductions before bond claim is submitted. CROSSUB collects rent; agent handles bond."
            onApprove={() => toast.success('Bond settlement approved')}
            onDecline={(r) => toast.success(`Query raised: ${r}`)}
            onRequote={(r) => toast.info(`More info requested: ${r}`)}
          />
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Checklist</h2>
          {item.checklist.map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-3 text-sm"
            >
              <span>{step.label}</span>
              <StatusBadge
                label={step.status}
                variant={step.status === 'done' ? 'success' : 'default'}
              />
            </div>
          ))}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Bond breakdown</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {item.bondBreakdown.map((row) => (
              <li key={row.label} className="flex justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn(row.amount < 0 && 'text-destructive')}>
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <Timeline entries={item.timeline} />
        </section>
      </div>
    </AgentShell>
  );
}
