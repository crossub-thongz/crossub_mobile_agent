'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { TrustFolioReceiptDialog } from '@/components/agent/trust/trust-folio-receipt-dialog';
import { TrustFolioWithdrawalDialog } from '@/components/agent/trust/trust-folio-withdrawal-dialog';
import { TrustJournalDialog } from '@/components/agent/trust/trust-journal-dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TRUST_NEW_TRANSACTION,
  TRUST_NEW_TRANSACTION_COPY as COPY,
  TRUST_NEW_TRANSACTION_OPTIONS,
  type TrustNewTransaction,
} from '@/constants/trust-transactions';
import type { TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';

/**
 * The Transactions tab's "New transaction" menu (the staff Actions menu, D100 and D101): a
 * receipt into a ledger, a withdrawal from a ledger, or a journal between two. `onPosted` runs
 * after each post so the list shows it.
 */
export function TrustNewTransactionMenu({
  agencyId,
  bankAccountId,
  accountCodes,
  onPosted,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  onPosted: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showing, setShowing] = useState<TrustNewTransaction | null>(null);
  const close = () => setShowing(null);
  const dialogProps = { agencyId, bankAccountId, onClose: close, onPosted };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" className="h-9">
            <Plus className="size-4" />
            {COPY.button}
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-1">
          {TRUST_NEW_TRANSACTION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="hover:bg-muted w-full rounded-md px-3 py-2 text-left"
              onClick={() => {
                setMenuOpen(false);
                setShowing(option.id);
              }}
            >
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-muted-foreground text-xs">{option.hint}</p>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {showing === TRUST_NEW_TRANSACTION.RECEIPT ? (
        <TrustFolioReceiptDialog {...dialogProps} accountCodes={accountCodes} />
      ) : showing === TRUST_NEW_TRANSACTION.WITHDRAWAL ? (
        <TrustFolioWithdrawalDialog {...dialogProps} accountCodes={accountCodes} />
      ) : showing === TRUST_NEW_TRANSACTION.JOURNAL ? (
        <TrustJournalDialog {...dialogProps} />
      ) : null}
    </>
  );
}
