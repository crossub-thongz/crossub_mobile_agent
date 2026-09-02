'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { MaintenanceApproveLandlordEmailDialog } from '@/components/maintenance/maintenance-approve-landlord-email-dialog';
import type { MaintenanceRequest } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function MaintenanceInlineActions({ item }: { item: MaintenanceRequest }) {
  const { maintenanceFromApi, approveMaintenanceQuote, declineMaintenanceQuote, refresh } =
    useAgentData();
  const apiItem = maintenanceFromApi.find((m) => m.id === item.id);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  if (!item.requiresApproval) return null;

  const handleApprove = async (skipRecipientEmail: boolean) => {
    if (!apiItem) {
      toast.error('Connect to the API to approve this quote.');
      return;
    }
    setApproving(true);
    try {
      await approveMaintenanceQuote(item.id, {
        skipRecipientEmail,
      });
      setApproveDialogOpen(false);
      toast.success(
        skipRecipientEmail
          ? 'Quote approved — proceeded without sending landlord email'
          : 'Quote approved',
      );
      await refresh();
    } catch {
      toast.error('Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!apiItem) {
      toast.error('Connect to the API to decline this quote.');
      return;
    }
    try {
      await declineMaintenanceQuote(item.id, 'Agent declined via mobile');
      toast.success('Quote declined');
      await refresh();
    } catch {
      toast.error('Decline failed');
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border/80 pt-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => setApproveDialogOpen(true)}
        >
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
      <MaintenanceApproveLandlordEmailDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        busy={approving}
        onProceed={(skipRecipientEmail) => void handleApprove(skipRecipientEmail)}
      />
    </div>
  );
}
