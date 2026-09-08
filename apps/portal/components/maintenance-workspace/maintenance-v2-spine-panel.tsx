'use client';

import { ShieldAlert, Wrench } from 'lucide-react';

import { MAINTENANCE_WORK_ORDER_STATUS_LABEL } from '@/constants/maintenance-v2';
import type {
  AgentMaintenanceDetail,
  AgentMaintenanceUrgentAuthorisation,
} from '@/lib/crossub-api/maintenance-client';
import { formatCurrency } from '@/lib/utils';

/**
 * The read-only slice of the Maintenance V2 spine the agent facade puts on a job — the authorised
 * work order and, on an urgent job, the Account-Manager authorisation that governs spend. The
 * agent reads it; it never sets it (that is the staff/AM lane), so this is a display card, not a
 * control. Renders nothing until the job actually carries one of these facts.
 */

/** The authorisation currently governing spend — the live ACTIVE one, or the one that went over. */
function governingUrgentAuthorisation(
  rows: AgentMaintenanceUrgentAuthorisation[],
): AgentMaintenanceUrgentAuthorisation | null {
  const governing = rows.filter((r) => r.status === 'ACTIVE' || r.status === 'EXCEEDED');
  return governing.length > 0 ? governing[governing.length - 1]! : null;
}

export function MaintenanceV2SpinePanel({
  agentDetail,
}: {
  agentDetail: AgentMaintenanceDetail | null;
}) {
  if (!agentDetail) return null;

  const workOrder = agentDetail.workOrder;
  const authorisation = governingUrgentAuthorisation(agentDetail.urgentAuthorisations ?? []);
  const spendingLimit = authorisation?.spendingLimit ?? null;
  const makeSafeOnly = authorisation?.makeSafeOnly ?? false;

  if (!workOrder && spendingLimit == null && !makeSafeOnly) return null;

  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Authorisation
      </p>
      <div className="mt-1.5 space-y-1.5">
        {workOrder ? (
          <div className="flex items-start gap-1.5">
            <Wrench className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-foreground">
              <span className="font-semibold">{workOrder.orderNumber}</span>
              <span className="text-muted-foreground">
                {' · '}
                {MAINTENANCE_WORK_ORDER_STATUS_LABEL[workOrder.status]}
                {workOrder.amountIncGst != null
                  ? ` · ${formatCurrency(workOrder.amountIncGst)} inc GST`
                  : ''}
              </span>
            </p>
          </div>
        ) : null}
        {spendingLimit != null ? (
          <p className="text-[11px] text-foreground">
            <span className="text-muted-foreground">Authorised limit </span>
            <span className="font-semibold">{formatCurrency(spendingLimit)}</span>
          </p>
        ) : null}
        {makeSafeOnly ? (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-3" />
            Make-safe only
          </span>
        ) : null}
      </div>
    </div>
  );
}
