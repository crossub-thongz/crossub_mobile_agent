'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { formatCurrency } from '@/lib/utils';

export function SettlementDeductionDialog({ caseData }: { caseData: TerminationCaseDetail }) {
  const open = useEndLeasingStore((s) => s.settlementDialogOpen);
  const setOpen = useEndLeasingStore((s) => s.setSettlementDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent elevated className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settlement deductions</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {caseData.settlement.deductions.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 border-b pb-2">
              <div>
                <p className="font-medium">{line.category}</p>
                <p className="text-muted-foreground text-xs">{line.description}</p>
                <p className="text-muted-foreground text-[10px] uppercase">{line.responsibility}</p>
              </div>
              <span className="shrink-0 tabular-nums">{formatCurrency(line.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t pt-3 text-sm font-semibold">
          <span>Total deductions</span>
          <span>{formatCurrency(caseData.settlement.totalDeductions)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
