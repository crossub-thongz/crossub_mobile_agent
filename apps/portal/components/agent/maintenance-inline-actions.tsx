'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { MaintenanceRequest } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function MaintenanceInlineActions({ item }: { item: MaintenanceRequest }) {
  const { maintenanceFromApi, approveMaintenanceQuote, declineMaintenanceQuote, refresh } =
    useAgentData();
  const apiItem = maintenanceFromApi.find((m) => m.id === item.id);
  const [skipLandlordEmail, setSkipLandlordEmail] = useState(false);

  if (!item.requiresApproval) return null;

  const handleApprove = async () => {
    if (!apiItem) {
      toast.error('Connect to the API to approve this quote.');
      return;
    }
    try {
      await approveMaintenanceQuote(item.id, {
        skipRecipientEmail: skipLandlordEmail,
      });
      toast.success(
        skipLandlordEmail
          ? 'Quote approved — proceeded without sending landlord email'
          : 'Quote approved',
      );
      await refresh();
    } catch {
      toast.error('Approval failed');
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
      <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-3.5 shrink-0 accent-primary"
          checked={skipLandlordEmail}
          onChange={(e) => setSkipLandlordEmail(e.target.checked)}
        />
        <span>Don&apos;t send email to landlord</span>
      </label>
      <div className="flex gap-2">
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
    </div>
  );
}
