'use client';

import { notFound, useParams } from 'next/navigation';
import { FileText, Gavel } from 'lucide-react';
import { toast } from 'sonner';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { CaseWorkflowProgressCard } from '@/components/agent/case-workflow-progress-card';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES, tribunalDetail, vacatingDetail } from '@/constants/routes';
import { AGENT_CASE_INTERACTIONS_ENABLED } from '@/lib/agent-case-mode';
import { tribunalWorkflowProgress } from '@/lib/case-workflows';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import { formatDateTime } from '@/lib/utils';

export default function TribunalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { tribunalCases } = useAgentData();
  const c = tribunalCases.find((x) => x.id === id);
  const back = useBackNavigation(ROUTES.TRIBUNAL, 'Tribunal');

  useRecordRecentCaseVisit({
    id: c?.id,
    kind: 'tribunal',
    address: c?.propertyAddress,
    href: c ? tribunalDetail(c.id) : '',
    module: 'tribunal',
  });

  if (!c) notFound();

  return (
    <AgentShell title="Tribunal case" backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <CaseWorkflowProgressCard progress={tribunalWorkflowProgress(c)} />

        {AGENT_CASE_INTERACTIONS_ENABLED && c.requiresAction && c.status === 'active' && (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              CROSSUB recommends a tribunal matter — your review required
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => toast.success('Tribunal case approved')}
              >
                Approve case
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => toast.info('Case returned to CROSSUB for review')}
              >
                Request changes
              </Button>
            </div>
          </div>
        )}

        <InfoPanel title="Case summary" icon={Gavel}>
          {c.caseNumber ? <InfoRow label="Case number" value={c.caseNumber} /> : null}
          <InfoRow label="Property" value={c.propertyAddress} />
          <InfoRow label="Tenant" value={c.tenantName} />
          <InfoRow label="Matter" value={c.matter} />
          <InfoRow label="Status" value={c.status} />
          {c.hearingDate && (
            <InfoRow label="Hearing date" value={formatDateTime(c.hearingDate)} />
          )}
          {c.inspector && <InfoRow label="Member / inspector" value={c.inspector} />}
          {c.orders && <InfoRow label="Orders" value={c.orders} />}
        </InfoPanel>

        {c.evidence && c.evidence.length > 0 && (
          <InfoPanel title="Evidence" icon={FileText}>
            <ul className="space-y-2 text-sm">
              {c.evidence.map((doc) => (
                <li key={doc} className="rounded-lg border bg-secondary/30 px-3 py-2">
                  {doc}
                </li>
              ))}
            </ul>
          </InfoPanel>
        )}

        <ModuleCommunications
          propertyId={c.propertyId}
          categories={['Tribunal']}
          title="Tribunal communications"
        />
      </div>
    </AgentShell>
  );
}
