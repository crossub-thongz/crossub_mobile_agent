'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { MaintenanceRequest } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function MaintenanceInlineActions({ item }: { item: MaintenanceRequest }) {
  const { maintenanceFromApi, approveMaintenanceQuote, declineMaintenanceQuote, refresh } =
    useAgentData();
  const apiItem = maintenanceFromApi.find((m) => m.id === item.id);

  if (!item.requiresApproval) return null;

  const handleApprove = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.success('Quote approved (demo)');
      return;
    }
    try {
      await approveMaintenanceQuote(apiItem.submittedQuotationId);
      toast.success('Quote approved');
      await refresh();
    } catch {
      toast.error('Approval failed');
    }
  };

  const handleDecline = async () => {
    if (!apiItem?.submittedQuotationId) {
      toast.message('Quote declined (demo)');
      return;
    }
    try {
      await declineMaintenanceQuote(apiItem.submittedQuotationId, 'Agent declined via mobile');
      toast.success('Quote declined');
      await refresh();
    } catch {
      toast.error('Decline failed');
    }
  };

  return (
    <div className="mt-3 flex gap-2 border-t border-border/80 pt-3">
      <Button size="sm" className="flex-1" onClick={() => void handleApprove()}>
        Approve
      </Button>
      <Button size="sm" variant="outline" className="flex-1" onClick={() => void handleDecline()}>
        Decline
      </Button>
      {item.quoteAmount != null && (
        <span className="text-muted-foreground self-center text-[10px]">
          {formatCurrency(item.quoteAmount)}
        </span>
      )}
    </div>
  );
}
