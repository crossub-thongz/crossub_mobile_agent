'use client';

import { useState } from 'react';
import { Building2, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

import { ResponsibilityBadge } from '@/components/maintenance-workspace/badges';
import { MaintenanceResponsibilityLandlordPanel } from '@/components/maintenance/maintenance-responsibility-landlord-panel';
import { MaintenanceReviewEvidencePanel } from '@/components/maintenance/maintenance-review-evidence-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmMaintenanceResponsibility, requestMoreMaintenanceEvidence } from '@/lib/maintenance/maintenance-case-ops';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { resolveInvitedContractorIds, resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkflowResponsibility } from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const RESPONSIBILITY_OPTIONS: {
  value: MaintenanceWorkflowResponsibility;
  label: string;
  icon: typeof User;
}[] = [
  { value: 'tenant', label: 'Tenant', icon: User },
  { value: 'landlord', label: 'Landlord', icon: Building2 },
  { value: 'strata', label: 'Strata', icon: Shield },
];

function parseCcEmails(value: string): string[] {
  return value
    .split(/[,;\n]/g)
    .map((part) => part.trim())
    .filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
}

export function MaintenanceReviewPanel({
  ctx,
  property,
  attachments = [],
  onCaseUpdated,
  apiConnected: apiConnectedProp,
}: {
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  attachments?: ApiMaintenanceAttachment[];
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  const { apiConnected: apiConnectedFromProvider } = useAgentData();
  const apiConnected = apiConnectedProp ?? apiConnectedFromProvider;
  const [pendingResponsibility, setPendingResponsibility] =
    useState<MaintenanceWorkflowResponsibility | null>(null);
  const [pendingContractorIds, setPendingContractorIds] = useState<string[]>([]);
  const [emailCcInput, setEmailCcInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPendingResponsibility(null);
    setPendingContractorIds([]);
    setEmailCcInput('');
  }, [ctx.item.id]);

  const agencyId = property?.agencyId;
  const invitedContractorIds = resolveInvitedContractorIds(ctx);
  const responsibility = resolveMaintenanceResponsibility(ctx);
  const isLive =
    ctx.workspaceCase.status === 'under_review' || ctx.workspaceCase.status === 'pending_evidence';
  const canManageEvidence = isLive && apiConnected;
  const awaitingEvidence = ctx.workspaceCase.status === 'pending_evidence';
  const isLandlord = pendingResponsibility === 'landlord';
  const showCcField =
    pendingResponsibility === 'tenant' || pendingResponsibility === 'strata';

  const handleAssignResponsibility = async () => {
    if (!pendingResponsibility) return;
    if (!apiConnected) {
      toast.error('Connect to the API to assign responsibility.');
      return;
    }
    if (isLandlord && pendingContractorIds.length === 0) {
      toast.error('Select at least one tradesman for landlord responsibility.');
      return;
    }

    setBusy(true);
    try {
      const ccEmails = showCcField ? parseCcEmails(emailCcInput) : undefined;
      await confirmMaintenanceResponsibility(ctx.item.id, pendingResponsibility, {
        preferredContractorIds: isLandlord ? pendingContractorIds : undefined,
        ccEmails,
      });
      toast.success(
        isLandlord
          ? `Responsibility set to landlord — RFQ sent to ${pendingContractorIds.length} contractor(s)`
          : `Responsibility set to ${pendingResponsibility} — notification email sent`,
      );
      setPendingResponsibility(null);
      setPendingContractorIds([]);
      setEmailCcInput('');
      await onCaseUpdated?.();
    } catch {
      toast.error('Could not assign responsibility');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestEvidence = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to request evidence.');
      return;
    }
    setBusy(true);
    try {
      await requestMoreMaintenanceEvidence(ctx.item.id);
      toast.success('Evidence request sent to tenant');
      await onCaseUpdated?.();
    } catch {
      toast.error('Could not request additional evidence');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectResponsibility = (value: MaintenanceWorkflowResponsibility) => {
    setPendingResponsibility(value);
    if (value !== 'landlord') setPendingContractorIds([]);
  };

  const confirmDisabled =
    !pendingResponsibility || busy || (isLandlord && pendingContractorIds.length === 0);

  return (
    <div className="space-y-4">
      <MaintenanceReviewEvidencePanel
        requestId={ctx.item.id}
        title={ctx.workspaceCase.issueType}
        description={ctx.workspaceCase.description}
        attachments={attachments}
        canManage={canManageEvidence}
        apiConnected={apiConnected}
        onUpdated={onCaseUpdated}
      />

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Responsibility review</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Confirm whether the repair is landlord, tenant, or strata responsibility. A notification
          email is sent when you confirm — no draft preview is shown here.
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Responsible party</dt>
            <dd className="mt-1">
              {responsibility ? (
                <ResponsibilityBadge responsibility={responsibility} />
              ) : (
                <span className="text-muted-foreground font-medium">Pending assignment</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Media verification</dt>
            <dd className="font-medium">
              {responsibility || !isLive ? 'Reviewed' : 'Awaiting verification'}
            </dd>
          </div>
        </dl>
      </section>

      {isLive ? (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          {awaitingEvidence ? (
            <p className="text-muted-foreground text-xs">
              Waiting for the tenant to upload additional evidence. You can assign responsibility
              once media is sufficient.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-xs">
                Assign who is responsible for this issue:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {RESPONSIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelectResponsibility(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium capitalize transition-colors',
                      pendingResponsibility === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              {isLandlord ? (
                <MaintenanceResponsibilityLandlordPanel
                  requestId={ctx.item.id}
                  agencyId={agencyId}
                  apiConnected={apiConnected}
                  selectedContractorIds={pendingContractorIds}
                  onChangeSelectedContractorIds={setPendingContractorIds}
                  disabled={busy}
                />
              ) : null}

              {showCcField ? (
                <div className="space-y-1.5 rounded-xl border border-dashed p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Cc (optional)
                  </p>
                  <Input
                    value={emailCcInput}
                    onChange={(e) => setEmailCcInput(e.target.value)}
                    placeholder="optional@example.com, another@example.com"
                    className="h-9 text-xs"
                    disabled={busy}
                  />
                  <p className="text-muted-foreground text-[10px]">
                    Separate multiple addresses with commas. Included on the sent email.
                  </p>
                </div>
              ) : null}

              <Button
                type="button"
                className="w-full"
                disabled={confirmDisabled}
                onClick={() => void handleAssignResponsibility()}
              >
                Confirm responsibility &amp; send message
              </Button>
            </>
          )}

          <div className="rounded-xl border border-dashed p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Request more evidence
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Ask the tenant for clearer photos or video before proceeding.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={busy || awaitingEvidence}
                onClick={() => void handleRequestEvidence()}
              >
                Request evidence
              </Button>
            </div>
          </div>
        </section>
      ) : responsibility ? (
        <section className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Responsibility confirmed</p>
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Assigned responsibility</dt>
              <dd className="mt-1">
                <ResponsibilityBadge responsibility={responsibility} />
              </dd>
            </div>
            {responsibility === 'landlord' && invitedContractorIds.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Tradesmen sent for quote review</dt>
                <dd className="mt-1 text-sm font-medium">
                  {invitedContractorIds.length} contractor
                  {invitedContractorIds.length === 1 ? '' : 's'} invited
                  {ctx.item.contractorName ? ` · Primary: ${ctx.item.contractorName}` : ''}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
