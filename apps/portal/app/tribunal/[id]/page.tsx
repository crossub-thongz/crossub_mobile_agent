'use client';

import { notFound, useParams } from 'next/navigation';
import { FileText, Gavel } from 'lucide-react';

import { InfoPanel, InfoRow } from '@/components/agent/info-panel';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/lib/utils';

export default function TribunalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { tribunalCases } = useAgentData();
  const c = tribunalCases.find((x) => x.id === id);

  if (!c) notFound();

  return (
    <AgentShell title="Tribunal case" backHref={ROUTES.TRIBUNAL}>
      <div className="space-y-4">
        <InfoPanel title="Case summary" icon={Gavel}>
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
      </div>
    </AgentShell>
  );
}
