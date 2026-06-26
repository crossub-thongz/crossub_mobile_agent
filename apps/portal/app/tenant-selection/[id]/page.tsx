'use client';

import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useAgentStore } from '@/lib/store';
import { tenantSelectionDecisionKey } from '@/lib/tenant-selection';
import { formatCurrency } from '@/lib/utils';

export default function TenantSelectionPage() {
  const params = useParams();
  const id = params.id as string;
  const { tenantSelections } = useAgentData();
  const setTenantSelectionDecision = useAgentStore((s) => s.setTenantSelectionDecision);
  const item = tenantSelections.find((t) => t.id === id);

  if (!item) notFound();

  const handleApprove = () => {
    setTenantSelectionDecision(tenantSelectionDecisionKey(item.propertyId, item.id), {
      action: 'approved',
      applicantName: item.applicantName,
      decidedAt: new Date().toISOString(),
    });
    toast.success('Applicant approved — lease communication triggered');
  };

  const handleDecline = (reason: string) => {
    setTenantSelectionDecision(tenantSelectionDecisionKey(item.propertyId, item.id), {
      action: 'rejected',
      applicantName: item.applicantName,
      decidedAt: new Date().toISOString(),
    });
    toast.success(`Declined: ${reason}`);
  };

  return (
    <AgentShell title="Tenant selection" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-semibold">{item.applicantName}</p>
          <p className="text-muted-foreground text-xs">{item.propertyAddress}</p>
          <p className="mt-2 text-sm">
            {formatCurrency(item.proposedRent)}/wk · {item.leaseTerm}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">{item.status}</p>
        </div>

        <CaseContactActions propertyId={item.propertyId} caseLabel="Tenant selection" />

        <ApprovalPanel
          title={`Approve ${item.applicantName}`}
          recommendation="Shortlisted after open inspection — references verified by CROSSUB."
          disabled={!item.requiresApproval}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onRequote={(r) => toast.info(`Query sent: ${r}`)}
        />

        <section>
          <h2 className="mb-2 text-sm font-semibold">Documents</h2>
          <ul className="space-y-2 text-sm">
            {item.documents.map((d) => (
              <li key={d} className="flex justify-between rounded-lg border px-3 py-2">
                <span>{d}</span>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <a href={`#${d.replace(/\s+/g, '-').toLowerCase()}`} download={d}>
                    Download
                  </a>
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
