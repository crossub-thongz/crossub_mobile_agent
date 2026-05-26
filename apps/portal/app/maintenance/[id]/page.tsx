'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { CommunicationPanel } from '@/components/agent/communication-panel';
import { MaintenanceStageTracker } from '@/components/agent/stage-tracker';
import { StatusBanner } from '@/components/agent/status-banner';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const {
    maintenanceAll,
    maintenanceFromApi,
    approveMaintenanceQuote,
    declineMaintenanceQuote,
    refresh,
  } = useAgentData();

  const item = maintenanceAll.find((m) => m.id === id);
  const apiItem = maintenanceFromApi.find((m) => m.id === id) as
    | MappedMaintenance
    | undefined;

  if (!item) notFound();

  const comms = useMemo(
    () =>
      apiItem?.apiNotifications.map((n) => ({
        title: n.title,
        message: n.message,
        channel: n.channel,
        at: n.createdAt,
      })) ?? [],
    [apiItem],
  );

  const handleApprove = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('No submitted quotation on API — demo action only');
      return;
    }
    try {
      await approveMaintenanceQuote(apiItem.submittedQuotationId);
      toast.success('Quote approved via crossub_web API');
      await refresh();
    } catch {
      toast.error('Approval failed — check API connection');
    }
  };

  const handleDecline = async (reason: string) => {
    if (!apiItem?.submittedQuotationId) {
      toast.error('Demo only — connect API for live decline');
      return;
    }
    try {
      await declineMaintenanceQuote(apiItem.submittedQuotationId, reason);
      toast.success('Quote declined — requote workflow started');
      await refresh();
    } catch {
      toast.error('Decline failed');
    }
  };

  return (
    <AgentShell title={item.trackingNumber} backHref={ROUTES.MAINTENANCE}>
      <div className="space-y-4">
        <StatusBanner
          status={item.status}
          subtitle={item.propertyAddress}
          tone={item.requiresApproval ? 'action' : item.priority === 'urgent' ? 'urgent' : 'default'}
        />

        <CaseContactActions propertyId={item.propertyId} caseLabel={item.title} />

        <MaintenanceStageTracker current={item.status} />

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="text-base font-semibold">{item.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.description}
          </p>
          {item.contractorName && (
            <p className="text-muted-foreground text-xs">
              Contractor: {item.contractorName}
              {item.quoteAmount != null && ` · $${item.quoteAmount.toLocaleString()}`}
            </p>
          )}
        </div>

        {(item.invoiceUploaded != null || item.completionEvidenceUploaded != null) && (
          <dl className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Completion evidence</dt>
              <dd className="font-medium">
                {item.completionEvidenceUploaded ? 'Uploaded' : 'Pending'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Invoice</dt>
              <dd className="font-medium">
                {item.invoiceUploaded ? 'Sent' : 'Pending'}
              </dd>
            </div>
          </dl>
        )}

        {item.requiresApproval && item.responsibility === 'landlord' && (
          <ApprovalPanel
            title={item.title}
            amount={item.quoteAmount}
            contractor={item.contractorName}
            expiry={item.quoteExpiry}
            recommendation={item.recommendation}
            quoteDocumentUrl={item.quoteDocumentUrl}
            disabled={!item.requiresApproval}
            onApprove={() => void handleApprove()}
            onDecline={(r) => void handleDecline(r)}
            onRequote={(r) => void handleDecline(`Requote requested: ${r}`)}
          />
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold">Communication</h2>
          <CommunicationPanel items={comms} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Timeline & audit</h2>
          <Timeline entries={item.timeline} />
        </section>
      </div>
    </AgentShell>
  );
}
