'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES, tenantNew } from '@/constants/routes';
import {
  APPLICANT_DECISION,
  TENANT_SELECTION_COPY,
  type ApplicantDecisionValue,
} from '@/constants/self-managed-leasing';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { setAgentApplicationDecision } from '@/lib/crossub-api/agent-client';
import { useAgentStore } from '@/lib/store';
import { prefillFromTenantSelection } from '@/lib/tenant-provision-prefill';
import { tenantSelectionDecisionKey } from '@/lib/tenant-selection';
import { formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export default function TenantSelectionPage() {
  const params = useParams();
  const id = params.id as string;
  const { tenantSelections, refresh } = useAgentData();
  const [deciding, setDeciding] = useState(false);
  const back = useBackNavigation(ROUTES.TASKS, 'Tasks');
  const setTenantSelectionDecision = useAgentStore((s) => s.setTenantSelectionDecision);
  const item = tenantSelections.find((t) => t.id === id);

  if (!item) notFound();

  const provisionPrefill = prefillFromTenantSelection(item);
  const createTenantHref = tenantNew({
    email: provisionPrefill.email,
    firstName: provisionPrefill.firstName,
    lastName: provisionPrefill.lastName,
    selectionId: item.id,
    propertyId: item.propertyId,
  });

  /** Records the decision on the server, then mirrors it into the store until the refresh lands. */
  const decide = async (decision: ApplicantDecisionValue, successMessage: string) => {
    setDeciding(true);
    try {
      await setAgentApplicationDecision(item.propertyId, item.id, { decision });
      setTenantSelectionDecision(tenantSelectionDecisionKey(item.propertyId, item.id), {
        action: decision,
        applicantName: item.applicantName,
        decidedAt: new Date().toISOString(),
      });
      toast.success(successMessage);
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, TENANT_SELECTION_COPY.decisionFailed));
    } finally {
      setDeciding(false);
    }
  };

  const handleApprove = () =>
    void decide(APPLICANT_DECISION.APPROVED, TENANT_SELECTION_COPY.approved(item.applicantName));

  const handleDecline = (reason: string) =>
    void decide(APPLICANT_DECISION.REJECTED, TENANT_SELECTION_COPY.declined(reason));

  return (
    <AgentShell title="Tenant selection" backHref={back.href} backLabel={back.label}>
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
          disabled={!item.requiresApproval || deciding}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onRequote={(r) => toast.info(`Query sent: ${r}`)}
        />

        <Button asChild className="w-full">
          <Link href={createTenantHref}>Create tenant app login</Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Links this applicant to a tenant login and starts leasing onboarding (step 4) in the
          tenant app.
        </p>

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
