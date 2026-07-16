'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ApiQuotation } from '@/lib/crossub-api/types';
import { buildQuotationLineItems } from '@/lib/maintenance/quotation-line-items';
import { cn, formatCurrency } from '@/lib/utils';

export function MaintenanceRepairQuotationPanel({
  quote,
  contractorName,
  mode = 'review',
  busy = false,
  onApprove,
  onDecline,
}: {
  quote: ApiQuotation;
  contractorName?: string;
  mode?: 'review' | 'readonly';
  busy?: boolean;
  onApprove?: () => void;
  onDecline?: (reason: string) => void;
}) {
  const [selectedLineId, setSelectedLineId] = useState('1');
  const [comments, setComments] = useState(quote.declineReason ?? '');

  const { lines, totals } = useMemo(
    () => buildQuotationLineItems(quote),
    [quote],
  );

  const showActions = mode === 'review' && quote.status === 'submitted';

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-background px-4 py-3 text-center">
        <h3 className="text-base font-semibold text-[#1f4f59]">Repair Quotations</h3>
        {contractorName ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{contractorName}</p>
        ) : null}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="bg-[#5f9f6b] text-white">
                  <th className="w-10 px-2 py-2" />
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold">Quantity</th>
                  <th className="px-3 py-2 font-semibold">Unit Price</th>
                  <th className="px-3 py-2 font-semibold">GST</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="radio"
                        name={`quote-line-${quote.id}`}
                        className="size-4 accent-[#5f9f6b]"
                        checked={selectedLineId === line.id}
                        disabled={busy || !showActions}
                        onChange={() => setSelectedLineId(line.id)}
                      />
                    </td>
                    <td className="px-3 py-2 align-top whitespace-pre-wrap">{line.description}</td>
                    <td className="px-3 py-2 align-top tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {formatCurrency(line.unitPriceExGst)}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums">{formatCurrency(line.gst)}</td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {formatCurrency(line.amountIncGst)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <dl className="w-full max-w-xs space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(totals.subtotalExGst)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Total GST</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(totals.totalGst)}</dd>
              </div>
              <div className="border-t pt-1">
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold">TOTAL AUD</dt>
                  <dd className="text-base font-bold tabular-nums">
                    {formatCurrency(totals.totalIncGst)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-[#5f9f6b]">Comments</p>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            readOnly={!showActions}
            placeholder={showActions ? 'Optional notes or decline reason' : 'No comments'}
            className={cn(
              'min-h-[220px] resize-none rounded-lg border text-xs',
              !showActions && 'bg-muted/20',
            )}
          />
        </div>
      </div>

      {showActions ? (
        <div className="flex justify-end gap-3 border-t border-[#5f9f6b]/30 px-4 py-3">
          <Button
            type="button"
            className="min-w-[110px] bg-[#5f9f6b] text-white hover:bg-[#4f8d5b]"
            disabled={busy}
            onClick={() => onApprove?.()}
          >
            Approve
          </Button>
          <Button
            type="button"
            className="min-w-[110px] bg-[#e85d3f] text-white hover:bg-[#d14f35]"
            disabled={busy}
            onClick={() =>
              onDecline?.(comments.trim() || 'Agent declined the repair quotation')
            }
          >
            Decline
          </Button>
        </div>
      ) : quote.status !== 'submitted' ? (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-xs capitalize">
            Quotation {quote.status}
            {quote.declineReason ? ` — ${quote.declineReason}` : ''}
          </p>
        </div>
      ) : null}
    </section>
  );
}
