'use client';

import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { getTenantSelection } from '@/lib/mock-data';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/utils';

export default function TenantSelectionPage() {
  const params = useParams();
  const item = getTenantSelection(params.id as string);

  if (!item) notFound();

  return (
    <AgentShell title="Tenant selection" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-semibold">{item.applicantName}</p>
          <p className="text-muted-foreground text-xs">{item.propertyAddress}</p>
          <p className="mt-2 text-sm">
            {formatCurrency(item.proposedRent)}/wk · {item.leaseTerm}
          </p>
        </div>

        <ApprovalPanel
          title={`Approve ${item.applicantName}`}
          recommendation="Shortlisted after open inspection — references verified by CROSSUB."
          onApprove={() => toast.success('Applicant approved — lease communication triggered')}
          onDecline={(r) => toast.success(`Declined: ${r}`)}
          onRequote={(r) => toast.info(`Query sent: ${r}`)}
        />

        <section>
          <h2 className="mb-2 text-sm font-semibold">Documents</h2>
          <ul className="space-y-2 text-sm">
            {item.documents.map((d) => (
              <li key={d} className="flex justify-between rounded-lg border px-3 py-2">
                <span>{d}</span>
                <Button variant="link" className="h-auto p-0 text-xs">
                  View
                </Button>
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
