'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustEditBillDialog } from '@/components/agent/trust/trust-edit-bill-dialog';
import { TrustNewBillDialog } from '@/components/agent/trust/trust-new-bill-dialog';
import { TrustPayBillDialog } from '@/components/agent/trust/trust-pay-bill-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustDownloadButton,
  TrustPill,
  TrustReasonDialog,
  TrustSearchInput,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import {
  TRUST_BILL_DISPLAY_STATUS,
  TRUST_BILL_DISPLAY_STATUS_LABEL,
  TRUST_BILL_DISPLAY_STATUS_TONE,
  TRUST_BILL_STAGE,
  TRUST_BILL_STAGE_ALL,
  TRUST_BILL_STATUS,
  TRUST_BILLS_COPY as COPY,
  TRUST_EDIT_BILL_COPY,
  TRUST_PAGE_COPY,
  TRUST_PAGE_SIZE_MAX,
  type TrustBillStageFilter,
} from '@/constants/trust';
import { useDebouncedValue, useTrustResource } from '@/hooks/use-trust-resource';
import {
  cancelTrustBill,
  downloadTrustBillAttachment,
  fetchTrustBills,
  type TrustAccountCode,
  type TrustBill,
  type TrustBillList,
} from '@/lib/crossub-api/agent-trust-client';
import { formatCents, formatTrustDate } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';

function stageOptions(counts: TrustBillList['counts'] | undefined) {
  const n = (value: number | undefined) => (value == null ? '' : ` (${value})`);
  return [
    { id: TRUST_BILL_STAGE.DUE, label: `${COPY.due}${n(counts?.due)}` },
    { id: TRUST_BILL_STAGE.FUTURE, label: `${COPY.future}${n(counts?.future)}` },
    { id: TRUST_BILL_STAGE.PAID, label: `${COPY.paid}${n(counts?.paid)}` },
    { id: TRUST_BILL_STAGE_ALL, label: `${COPY.all}${n(counts?.all)}` },
  ] as const satisfies readonly { id: TrustBillStageFilter; label: string }[];
}

export function TrustBillsTab({
  agencyId,
  bankAccountId,
  accountCodes,
  onChanged,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  /** After a bill is added, edited, cancelled or paid (the summary tiles reload). */
  onChanged?: () => void;
}) {
  const [stage, setStage] = useState<TrustBillStageFilter>(TRUST_BILL_STAGE.DUE);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [payBill, setPayBill] = useState<TrustBill | null>(null);
  const [editBill, setEditBill] = useState<TrustBill | null>(null);
  const [cancelBill, setCancelBill] = useState<TrustBill | null>(null);
  const query = useDebouncedValue(search.trim());

  const { data, error, loading, reload } = useTrustResource(
    `${agencyId}:${bankAccountId}:${stage}:${query}`,
    () =>
      fetchTrustBills(agencyId, bankAccountId, {
        pageSize: TRUST_PAGE_SIZE_MAX,
        status: stage === TRUST_BILL_STAGE_ALL ? undefined : stage,
        search: query || undefined,
      }),
  );
  const afterChange = () => {
    reload();
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <TrustSearchInput value={search} onChange={setSearch} placeholder={COPY.searchPlaceholder} />
        <div className="min-w-0 flex-1">
          <FilterChips options={stageOptions(data?.counts)} value={stage} onChange={setStage} />
        </div>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {COPY.newBill}
        </Button>
      </div>

      {!data ? (
        error ? (
          <TrustLoadError error={error} onRetry={reload} />
        ) : loading ? (
          <TrustLoading />
        ) : null
      ) : data.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query ? TRUST_PAGE_COPY.noMatches : COPY.empty}
        </p>
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border bg-card', loading && 'opacity-60')}>
          <table className="w-full border-collapse text-sm">
            <thead className="border-b">
              <tr>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.number}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.supplier}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden lg:table-cell')}>{COPY.owner}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'hidden md:table-cell')}>{COPY.dueDate}</th>
                <th className={cn(TRUST_TABLE_HEAD_CLASS, 'text-right')}>{COPY.amount}</th>
                <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.status}</th>
                <th className={TRUST_TABLE_HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((bill) => (
                <tr key={bill.id} className="border-b last:border-b-0">
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap')}>
                    <p className="font-medium">#{bill.billNumber}</p>
                    <p className="text-muted-foreground text-xs">{formatTrustDate(bill.billDate)}</p>
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <p className="font-medium">{bill.supplierLedger.name}</p>
                    <p className="text-muted-foreground text-xs">{bill.details}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden lg:table-cell')}>
                    <p>{bill.ownerLedger.name}</p>
                    <p className="text-muted-foreground text-xs">{bill.property.referenceAddress}</p>
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'hidden whitespace-nowrap md:table-cell')}>
                    {formatTrustDate(bill.dueDate)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right tabular-nums')}>
                    {formatCents(bill.amountCents)}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    <TrustPill className={TRUST_BILL_DISPLAY_STATUS_TONE[bill.displayStatus]}>
                      {TRUST_BILL_DISPLAY_STATUS_LABEL[bill.displayStatus]}
                    </TrustPill>
                    {bill.funding.shortfallCents ? (
                      <p className="text-destructive mt-1 text-xs">
                        {COPY.shortfall(formatCents(bill.funding.shortfallCents))}
                      </p>
                    ) : null}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-right')}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {bill.displayStatus === TRUST_BILL_DISPLAY_STATUS.PENDING ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setPayBill(bill)}
                        >
                          {COPY.pay}
                        </Button>
                      ) : null}
                      {bill.status === TRUST_BILL_STATUS.PENDING ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setEditBill(bill)}
                          >
                            {TRUST_EDIT_BILL_COPY.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setCancelBill(bill)}
                          >
                            {TRUST_EDIT_BILL_COPY.cancelBill}
                          </Button>
                        </>
                      ) : null}
                      {bill.attachment ? (
                        <TrustDownloadButton
                          label={TRUST_EDIT_BILL_COPY.attachment}
                          filename={bill.attachment.fileName}
                          fetchBlob={() => downloadTrustBillAttachment(agencyId, bill.id)}
                          failedMessage={TRUST_EDIT_BILL_COPY.attachmentFailed}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <TrustNewBillDialog
          agencyId={agencyId}
          bankAccountId={bankAccountId}
          accountCodes={accountCodes}
          onClose={() => setCreating(false)}
          onCreated={afterChange}
        />
      ) : null}
      {editBill ? (
        <TrustEditBillDialog
          key={editBill.id}
          agencyId={agencyId}
          bill={editBill}
          accountCodes={accountCodes}
          onClose={() => setEditBill(null)}
          onSaved={afterChange}
        />
      ) : null}
      {cancelBill ? (
        <TrustReasonDialog
          key={cancelBill.id}
          title={TRUST_EDIT_BILL_COPY.cancelTitle(cancelBill.billNumber)}
          description={TRUST_EDIT_BILL_COPY.cancelDescription}
          reasonLabel={TRUST_EDIT_BILL_COPY.cancelReason}
          reasonRequired={TRUST_EDIT_BILL_COPY.cancelReasonRequired}
          submitLabel={TRUST_EDIT_BILL_COPY.cancelSubmit}
          cancelLabel={TRUST_EDIT_BILL_COPY.cancelKeep}
          destructive
          onSubmit={async (reason) => {
            await cancelTrustBill(agencyId, cancelBill.id, { reason });
            toast.success(TRUST_EDIT_BILL_COPY.cancelled(cancelBill.billNumber));
            afterChange();
          }}
          onClose={() => setCancelBill(null)}
        />
      ) : null}
      {payBill ? (
        <TrustPayBillDialog
          key={payBill.id}
          agencyId={agencyId}
          bill={payBill}
          onClose={() => setPayBill(null)}
          onPaid={afterChange}
        />
      ) : null}
    </div>
  );
}
