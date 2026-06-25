'use client';

import { useState } from 'react';
import { Check, User, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { TenantSelectionCase } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const DEMO_APPLICANTS = [
  { id: 'a1', name: 'Priya Nair', email: 'priya.nair@email.com', income: '$92,000', score: 'Excellent' },
  { id: 'a2', name: 'Marcus Lee', email: 'marcus.lee@email.com', income: '$78,500', score: 'Good' },
  { id: 'a3', name: 'Emma Walsh', email: 'emma.w@email.com', income: '$85,200', score: 'Good' },
];

export function ApplicantListDialog({
  open,
  onClose,
  selection,
}: {
  open: boolean;
  onClose: () => void;
  selection: TenantSelectionCase;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (!open) return null;

  const detail = DEMO_APPLICANTS.find((a) => a.id === detailId);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Applicant list</h2>
            <p className="text-muted-foreground text-xs">{selection.propertyAddress}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {detail ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="text-primary text-xs font-medium"
              >
                ← Back to list
              </button>
              <div className="rounded-xl border p-4">
                <p className="font-semibold">{detail.name}</p>
                <p className="text-muted-foreground text-xs">{detail.email}</p>
                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Proposed rent</dt>
                    <dd className="font-medium">{formatCurrency(selection.proposedRent)}/wk</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Household income</dt>
                    <dd>{detail.income}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reference score</dt>
                    <dd>{detail.score}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Documents</dt>
                    <dd>ID, payslips, rental history (demo)</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      toast.success(`${detail.name} approved`);
                      onClose();
                    }}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      toast.info(`${detail.name} rejected`);
                      onClose();
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {DEMO_APPLICANTS.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setDetailId(a.id)}
                    className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm hover:border-primary/30"
                  >
                    <div className="bg-secondary flex size-8 items-center justify-center rounded-lg">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-muted-foreground text-xs">{a.score} · {a.income}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
