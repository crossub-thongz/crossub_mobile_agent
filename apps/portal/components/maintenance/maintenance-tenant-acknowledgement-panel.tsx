'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { recordTenantAcknowledgementAndClose } from '@/lib/maintenance/maintenance-case-ops';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function MaintenanceTenantAcknowledgementPanel({
  ctx,
  onCaseUpdated,
  apiConnected = true,
}: {
  ctx: MaintenanceWorkflowContext;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const acknowledged =
    Boolean(ctx.workspaceCase.tenantApprovalReceived) ||
    ctx.workspaceCase.status === 'closed';
  const isClosed = ctx.workspaceCase.status === 'closed';
  const canRecord =
    apiConnected && !isClosed && ctx.workspaceCase.status === 'in_progress';

  const handleAcknowledge = async () => {
    if (!canRecord) return;
    setBusy(true);
    try {
      await recordTenantAcknowledgementAndClose(ctx.item.id);
      toast.success('Tenant acknowledgement recorded — job closed');
      await onCaseUpdated?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not record acknowledgement'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        Tenant is responsible for arranging and completing this repair. No contractor quote,
        completion evidence, or invoice is required — only their acknowledgement.
      </p>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tenant responsible
            </p>
            <p className="mt-1 text-sm font-semibold">
              {acknowledged ? 'Acknowledged' : 'Acknowledgement required'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Record that the tenant acknowledges they will find their own handyman to resolve the
              issue.
            </p>
          </div>
          {acknowledged ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
          ) : null}
        </div>

        {canRecord ? (
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void handleAcknowledge()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Record acknowledgement — Close job
          </Button>
        ) : isClosed ? (
          <p className="text-muted-foreground text-xs">
            Job closed after tenant acknowledgement.
          </p>
        ) : null}
      </section>
    </div>
  );
}
