'use client';

import { TaskStatusRow } from '@/components/agent/task-status-row';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { rentReviewDetail, ROUTES } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';

export default function RentReviewPage() {
  const { rentReviews } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);

  return (
    <AgentShell title="Rent Review" backHref={ROUTES.LEASING}>
      <div className="space-y-2">
        {rentReviews.map((r) => (
          <TaskStatusRow
            key={r.id}
            item={{
              id: r.id,
              propertyAddress: r.propertyAddress,
              taskLabel: 'Rent review',
              status: decisions[r.id]
                ? decisions[r.id]?.action === 'confirmed'
                  ? 'Confirmed'
                  : 'Custom amount submitted'
                : r.status,
              href: rentReviewDetail(r.id),
              module: 'Rent review',
              tone:
                r.requiresApproval && !decisions[r.id]
                  ? 'warning'
                  : r.tenantResponse === 'counter'
                    ? 'neutral'
                    : 'ok',
              requiresApproval: r.requiresApproval && !decisions[r.id],
            }}
          />
        ))}
      </div>
    </AgentShell>
  );
}
