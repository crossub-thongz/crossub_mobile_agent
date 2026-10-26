'use client';

import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { MAINTENANCE_WORK_ORDER_STATUS_LABEL } from '@/constants/maintenance-v2';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import type { AgentMaintenanceWorkOrder } from '@/lib/crossub-api/maintenance-client';
import { formatCurrency } from '@/lib/utils';

/** The work order the approval issued to the tradie: its number, who it went to, and its state. */
export function WorkOrderStep({ workOrder }: { workOrder: AgentMaintenanceWorkOrder }) {
  return (
    <StepCard title={COPY.workOrderTitle}>
      <p className="text-sm">
        {COPY.workOrderIssued(workOrder.orderNumber, workOrder.contractorName)}
        {workOrder.amountIncGst !== null
          ? ` ${COPY.workOrderAmount(formatCurrency(workOrder.amountIncGst))}`
          : ''}
      </p>
      <p className="text-muted-foreground text-xs">
        {COPY.workOrderStatus}: {MAINTENANCE_WORK_ORDER_STATUS_LABEL[workOrder.status]}
      </p>
    </StepCard>
  );
}
