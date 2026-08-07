'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressLineAutocomplete } from '@/components/end-leasing/address-line-autocomplete';
import { TerminationKeyReturnDateDialog } from '@/components/end-leasing/termination-key-return-date-dialog';
import { dateOnly } from '@/components/agent/property-vacate-date-field';
// import { TerminationVacateDateDialog } from '@/components/end-leasing/termination-vacate-date-dialog';
import {
  breachStatusLabel,
  endLeasingKeyReturnDate,
  endLeasingVacateDate,
  isBreachLease,
} from '@/lib/end-leasing/agent-workflow-model';
import {
  actualDaysNoticeToVacate,
  agreementRemainingPercent,
  daysNotifyInAdvanceLabel,
  endLeasingLeaseTypeLabel,
  tenantNoticeDate,
} from '@/lib/end-leasing/vacate-display';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { terminationApi } from '@/lib/termination-case-api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug">{children}</dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  actions,
  highlight = false,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card',
        highlight &&
          'border-amber-500/50 bg-amber-500/[0.06] shadow-[0_0_0_1px_rgba(245,158,11,0.35)] ring-2 ring-amber-500/30',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b px-4 py-2.5',
          highlight && 'border-amber-500/30 bg-amber-500/[0.08]',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {highlight ? (
            <KeyRound className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          ) : null}
          <h3 className={cn('text-sm font-semibold', highlight && 'text-amber-950 dark:text-amber-50')}>
            {title}
          </h3>
          {highlight ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Action required
            </span>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EndLeasingTenancyDetailsSection({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const vacateDate = endLeasingVacateDate(caseData);
  const breach = isBreachLease(caseData);
  const noticeDate = tenantNoticeDate(caseData);
  const actualDays = actualDaysNoticeToVacate(caseData);
  const remainingPct = agreementRemainingPercent(caseData);

  return (
    <SectionCard title="Tenant details">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Lease end date">
          {caseData.leaseEndDate ? formatDate(caseData.leaseEndDate) : '—'}
        </SummaryField>
        <SummaryField label="Notice date">
          {noticeDate ? formatDate(noticeDate) : '—'}
        </SummaryField>
        <SummaryField label="Days notify in advance">
          {daysNotifyInAdvanceLabel(caseData)}
          {actualDays != null && !breach ? (
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              Actual: {actualDays} day{actualDays === 1 ? '' : 's'} notice given
            </span>
          ) : null}
        </SummaryField>
        <SummaryField label="Lease type">{endLeasingLeaseTypeLabel(caseData)}</SummaryField>
        <SummaryField label="Vacate date">
          {vacateDate ? formatDate(vacateDate) : 'Not confirmed'}
        </SummaryField>
        <SummaryField label="Breach lease">
          <span className={breach ? 'text-destructive' : 'text-foreground'}>
            {breach ? 'Yes' : 'No'}
          </span>
          {breach ? (
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              {breachStatusLabel(caseData)}
            </span>
          ) : null}
        </SummaryField>
        <SummaryField label="Bond amount">{formatCurrency(caseData.bondHeld)}</SummaryField>
        {breach && remainingPct != null ? (
          <SummaryField label="% of agreement remaining">
            {remainingPct}% of lease term not completed
          </SummaryField>
        ) : null}
      </dl>
    </SectionCard>
  );
}

export function EndLeasingKeysReturnSection({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  // const [vacateDialogOpen, setVacateDialogOpen] = useState(false);
  const [keyReturnDialogOpen, setKeyReturnDialogOpen] = useState(false);

  const savedAddress = caseData.vacate.keysReturnAddress?.trim() ?? '';
  const [address, setAddress] = useState(savedAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const lastSavedRef = useRef(savedAddress);
  const tenantKeyReturnPhotos = caseData.vacatingPreparation.keyReturnPhotoUrls ?? [];
  const tenantKeyReturnSubmittedAt = caseData.vacatingPreparation.tenantKeyReturnSubmittedAt;

  useEffect(() => {
    setAddress(savedAddress);
    lastSavedRef.current = savedAddress;
  }, [savedAddress]);

  const saveAddress = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (trimmed === lastSavedRef.current) return;

      setSavingAddress(true);
      try {
        const updated = await terminationApi.setKeysReturnAddress(caseData.id, trimmed);
        lastSavedRef.current = trimmed;
        applyCase(updated);
        toast.success('Key return address saved');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save key return address');
      } finally {
        setSavingAddress(false);
      }
    },
    [applyCase, caseData.id],
  );

  const expectedVacate = endLeasingVacateDate(caseData) ?? '';
  const keyReturnDate = endLeasingKeyReturnDate(caseData);
  const keysReturned = caseData.vacate.keysReturned === true;
  const needsKeyReturnAction = !keysReturned;
  const [keyReturnDateDraft, setKeyReturnDateDraft] = useState(
    () => (keyReturnDate || expectedVacate).slice(0, 10),
  );
  const [savingKeyReturnDate, setSavingKeyReturnDate] = useState(false);
  const lastSavedKeyReturnDateRef = useRef((keyReturnDate || expectedVacate).slice(0, 10));

  useEffect(() => {
    const next = (keyReturnDate || expectedVacate).slice(0, 10);
    setKeyReturnDateDraft(next);
    lastSavedKeyReturnDateRef.current = next;
  }, [keyReturnDate, expectedVacate]);

  const saveKeyReturnDate = useCallback(async () => {
    const next = dateOnly(keyReturnDateDraft);
    if (!next || next === lastSavedKeyReturnDateRef.current) return;

    setSavingKeyReturnDate(true);
    try {
      const updated = await terminationApi.setKeyReturn(caseData.id, {
        date: next,
        keysReceived: false,
      });
      lastSavedKeyReturnDateRef.current = next;
      applyCase(updated);
      toast.success('Key return date saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save key return date');
    } finally {
      setSavingKeyReturnDate(false);
    }
  }, [applyCase, caseData.id, keyReturnDateDraft]);

  return (
    <>
      <SectionCard
        title="Keys return"
        highlight={needsKeyReturnAction}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={needsKeyReturnAction ? 'default' : 'outline'}
              className={cn('h-7 text-[11px]', needsKeyReturnAction && 'bg-amber-600 hover:bg-amber-600/90')}
              disabled={keysReturned}
              onClick={() => setKeyReturnDialogOpen(true)}
            >
              {keysReturned ? 'Key return recorded' : 'Record key return'}
            </Button>
            {/* <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setVacateDialogOpen(true)}
            >
              Change vacate date
            </Button> */}
          </div>
        }
      >
        <dl className="grid gap-4">
          {needsKeyReturnAction ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:text-amber-50">
              Set the key return address, then record the key return date and confirm keys have been
              received. The outgoing inspection step unlocks after keys are returned.
            </div>
          ) : null}
          {keysReturned ? (
            <SummaryField label="Keys return date">
              {keyReturnDateDraft ? formatDate(keyReturnDateDraft) : 'Not set'}
            </SummaryField>
          ) : (
            <div className="space-y-1.5">
              <dt className="text-muted-foreground text-xs font-medium">Keys return date</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <Input
                  id={`keys-return-date-${caseData.id}`}
                  type="date"
                  value={keyReturnDateDraft}
                  onChange={(e) => setKeyReturnDateDraft(e.target.value)}
                  onBlur={() => void saveKeyReturnDate()}
                  disabled={savingKeyReturnDate}
                  className="h-9 w-auto text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={savingKeyReturnDate || !keyReturnDateDraft}
                  onClick={() => void saveKeyReturnDate()}
                >
                  {savingKeyReturnDate ? 'Saving…' : 'Save date'}
                </Button>
              </dd>
              <p className="text-muted-foreground text-[11px]">
                Defaults to the vacate date — change if keys are returned on a different day.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <dt className="text-muted-foreground text-xs font-medium">Keys return address</dt>
            <dd>
              <AddressLineAutocomplete
                id={`keys-return-address-${caseData.id}`}
                value={address}
                onChange={setAddress}
                onPlaceSelect={(line) => void saveAddress(line)}
                onBlur={() => void saveAddress(address)}
                disabled={savingAddress}
              />
            </dd>
          </div>
          {tenantKeyReturnPhotos.length > 0 ? (
            <div className="space-y-2">
              <dt className="text-muted-foreground text-xs font-medium">Tenant key return proof</dt>
              <dd>
                {tenantKeyReturnSubmittedAt ? (
                  <p className="text-muted-foreground mb-2 text-[11px]">
                    Submitted {formatDate(tenantKeyReturnSubmittedAt)}
                  </p>
                ) : null}
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {tenantKeyReturnPhotos.map((url) => (
                    <li key={url} className="aspect-square overflow-hidden rounded-lg border">
                      <a href={url} target="_blank" rel="noreferrer" className="block size-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Tenant key return proof" className="size-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground text-xs">
              {caseData.vacate.keysReturned
                ? 'Keys have been returned and recorded.'
                : tenantKeyReturnSubmittedAt
                  ? 'Tenant submitted key return proof — confirm receipt to unlock outgoing inspection.'
                  : 'Awaiting tenant key return.'}
            </p>
          </div>
        </dl>
      </SectionCard>

      {/* <TerminationVacateDateDialog
        open={vacateDialogOpen}
        onOpenChange={setVacateDialogOpen}
        caseId={caseData.id}
        initialDate={expectedVacate.slice(0, 10)}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      /> */}

      <TerminationKeyReturnDateDialog
        open={keyReturnDialogOpen}
        onOpenChange={setKeyReturnDialogOpen}
        caseId={caseData.id}
        initialDate={(keyReturnDate || expectedVacate).slice(0, 10)}
        keysReturned={caseData.vacate.keysReturned}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      />
    </>
  );
}
