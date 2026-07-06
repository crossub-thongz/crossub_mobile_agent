'use client';

import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingContract, LeasingPropertyDetail } from '@/lib/leasing/types';

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function LeasingContractDialog({ detail }: { detail: LeasingPropertyDetail }) {
  const open = useLeasingWorkflowStore((s) => s.contractDialogOpen);
  const setOpen = useLeasingWorkflowStore((s) => s.setContractDialogOpen);
  const updateContract = useLeasingWorkflowStore((s) => s.updateContract);
  const confirmContract = useLeasingWorkflowStore((s) => s.confirmContract);

  const [newCondition, setNewCondition] = useState('');
  const id = detail.propertyId;
  const contract = detail.onboarding.agreement.contract;
  const signingStatus = detail.onboarding.agreement.signingStatus;
  const isSigned = signingStatus === 'signed';
  const isEditable = !isSigned;

  const applyContractChanges = (patch: Partial<LeasingContract>) => {
    updateContract(id, patch);
  };

  const addCondition = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    applyContractChanges({
      specialConditions: [
        ...contract.specialConditions,
        { id: `sc-${Date.now()}`, text: trimmed },
      ],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-base font-semibold">
            Agreement · {contract.contractId}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isSigned
              ? 'This agreement is signed and locked.'
              : contract.confirmed
                ? 'Edit lease terms or special conditions, then re-confirm before sending for signature.'
                : 'Edit lease terms and special conditions, then confirm when ready.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-13rem)] space-y-5 overflow-y-auto px-6 py-5">
          {isSigned ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
              Agreement signed — edits are locked.
            </div>
          ) : contract.confirmed ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-muted-foreground">
              If the tenant requests changes, edit below and re-confirm to refresh the agreement.
            </div>
          ) : null}

          <fieldset disabled={!isEditable} className="m-0 min-w-0 space-y-4 border-0 p-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Template">
                <Input
                  className="h-9"
                  value={contract.template}
                  onChange={(e) => applyContractChanges({ template: e.target.value })}
                />
              </Field>
              <Field label="Lease term">
                <Input
                  className="h-9"
                  value={contract.leaseTerm}
                  onChange={(e) => applyContractChanges({ leaseTerm: e.target.value })}
                />
              </Field>
              <Field label="Weekly rent">
                <Input
                  className="h-9 tabular-nums"
                  type="number"
                  value={contract.weeklyRent ?? ''}
                  onChange={(e) =>
                    applyContractChanges({
                      weeklyRent: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Bond">
                <Input
                  className="h-9 tabular-nums"
                  type="number"
                  value={contract.bond ?? ''}
                  onChange={(e) =>
                    applyContractChanges({
                      bond: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Special conditions</Label>
              <ul className="mt-2 space-y-1.5">
                {contract.specialConditions.length === 0 && (
                  <li className="rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
                    No special conditions added.
                  </li>
                )}
                {contract.specialConditions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-secondary/20 px-3 py-2"
                  >
                    <span className="min-w-0 text-[12.5px]">{c.text}</span>
                    <button
                      type="button"
                      aria-label="Remove condition"
                      className="shrink-0 rounded p-0.5 text-muted-foreground"
                      onClick={() =>
                        applyContractChanges({
                          specialConditions: contract.specialConditions.filter((x) => x.id !== c.id),
                        })
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Input
                  className="h-9"
                  placeholder="Add a special condition…"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCondition.trim()) {
                      addCondition(newCondition);
                      setNewCondition('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  disabled={!newCondition.trim()}
                  onClick={() => {
                    addCondition(newCondition);
                    setNewCondition('');
                  }}
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {!isSigned ? (
            <Button
              className="gap-1.5"
              onClick={() => {
                confirmContract(id);
                toast.success(contract.confirmed ? 'Contract re-confirmed' : 'Contract confirmed');
                setOpen(false);
              }}
            >
              <Check className="size-4" />
              {contract.confirmed ? 'Re-confirm contract' : 'Confirm contract'}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
