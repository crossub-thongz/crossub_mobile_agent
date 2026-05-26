'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ApprovalPanel({
  title,
  amount,
  contractor,
  expiry,
  recommendation,
  quoteDocumentUrl,
  onApprove,
  onDecline,
  onRequote,
  disabled,
}: {
  title: string;
  amount?: number;
  contractor?: string;
  expiry?: string;
  recommendation?: string;
  quoteDocumentUrl?: string;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onRequote: (reason: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<'idle' | 'decline' | 'requote'>('idle');
  const [reason, setReason] = useState('');

  const submitReason = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (mode === 'decline') onDecline(reason);
    else onRequote(reason);
    setMode('idle');
    setReason('');
  };

  if (disabled) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-primary text-sm font-medium">Decision recorded</p>
        <p className="text-muted-foreground mt-1 text-xs">
          This approval has been actioned. See timeline for audit record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          Approval required
        </p>
        <p className="mt-1 text-sm font-semibold">{title}</p>
      </div>

      {contractor && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Contractor</dt>
            <dd className="font-medium">{contractor}</dd>
          </div>
          {amount != null && (
            <div>
              <dt className="text-muted-foreground">Quote</dt>
              <dd className="font-medium">${amount.toLocaleString()} inc GST</dd>
            </div>
          )}
          {expiry && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Quote expires</dt>
              <dd className="font-medium">{expiry}</dd>
            </div>
          )}
        </dl>
      )}

      {recommendation && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          <span className="text-foreground font-medium">CROSSUB note: </span>
          {recommendation}
        </p>
      )}

      {quoteDocumentUrl && (
        <a
          href={quoteDocumentUrl}
          className="text-primary inline-flex text-xs font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          View quote document →
        </a>
      )}

      {mode === 'idle' ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onApprove}>
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setMode('decline')}
          >
            Decline
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setMode('requote')}
          >
            Requote
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="reason">
            Reason for {mode === 'decline' ? 'decline' : 'requote'}
          </Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required for audit trail"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setMode('idle')}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submitReason}>
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
