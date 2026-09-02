'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  StripePaymentDialog,
  type StripePaymentDialogState,
} from '@/components/billing/stripe-payment-dialog';
import { SelectChip } from '@/components/agent/form-step';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AgentInputFeedbackAnchor } from '@/components/ui/agent-input-feedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bindSanitizedTextValue } from '@/lib/strip-emojis';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  createAgentPropertyArrears,
  createAgentTribunalRentChasing,
  fetchAgentTribunalRentChasingPrefill,
  markAgentPropertyArrearsPaid,
  type AgentTribunalRentChasingPrefill,
  type CreateAgentTribunalRentChasingInput,
} from '@/lib/crossub-api/agent-workflow-client';
import { preparePlatformCharge } from '@/lib/crossub-api/agent-billing-client';
import { getStripePublishableKey } from '@/lib/stripe-client';
import {
  RENT_PERIOD_OPTIONS,
  type RentPeriodChoice,
} from '@/lib/rent-calculations';
import type { Property } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type ArrearsKind = 'rent' | 'bill' | 'bond';

const ARREARS_KIND_OPTIONS: { id: ArrearsKind; label: string }[] = [
  { id: 'rent', label: 'Rent arrears' },
  { id: 'bill', label: 'Bill arrears' },
  { id: 'bond', label: 'Bond arrears' },
];

const BILL_TYPE_PRESETS = [
  'Water',
  'Council',
  'Electricity',
  'Gas',
  'Strata',
  'Other',
] as const;

type BillRow = {
  id: string;
  billType: string;
  billName: string;
  dueDate: string;
  amount: string;
  customType: boolean;
};

function newBillRow(partial?: Partial<BillRow>): BillRow {
  return {
    id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    billType: '',
    billName: '',
    dueDate: '',
    amount: '',
    customType: false,
    ...partial,
  };
}

const selectClass =
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {children}
    </section>
  );
}

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
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function billRowsFromPrefill(
  rows: AgentTribunalRentChasingPrefill['billArrears'],
): BillRow[] {
  return rows.map((bill) =>
    newBillRow({
      billType: bill.billType,
      billName: bill.billName ?? bill.billType,
      dueDate: bill.dueDate ?? '',
      amount: bill.amount != null ? String(bill.amount) : '',
      customType: !BILL_TYPE_PRESETS.includes(
        bill.billType as (typeof BILL_TYPE_PRESETS)[number],
      ),
    }),
  );
}

function propertyAgreementEnd(prefill: AgentTribunalRentChasingPrefill | null): string {
  return (
    prefill?.bondArrears?.agreementEndDate?.slice(0, 10) ||
    prefill?.agreementEndDate?.slice(0, 10) ||
    ''
  );
}

function applyKindPrefill(
  kind: ArrearsKind,
  prefill: AgentTribunalRentChasingPrefill,
  setters: {
    setRentAmount: (value: string) => void;
    setPaymentCycle: (value: RentPeriodChoice) => void;
    setRentPaidTo: (value: string) => void;
    setBills: (rows: BillRow[]) => void;
    setAgreementEndDate: (value: string) => void;
    setBondAmount: (value: string) => void;
    setBondNotes: (value: string) => void;
  },
) {
  if (kind === 'rent' && prefill.rentArrears) {
    setters.setRentAmount(
      prefill.rentArrears.rentAmount != null
        ? String(prefill.rentArrears.rentAmount)
        : '',
    );
    setters.setPaymentCycle(
      (prefill.rentArrears.paymentCycle as RentPeriodChoice) ?? 'weekly',
    );
    setters.setRentPaidTo(prefill.rentArrears.rentPaidTo ?? '');
    return;
  }

  if (kind === 'bill' && prefill.billArrears.length > 0) {
    setters.setBills(billRowsFromPrefill(prefill.billArrears));
    return;
  }

  if (kind === 'bond') {
    setters.setAgreementEndDate(propertyAgreementEnd(prefill));
    if (prefill.bondArrears) {
      setters.setBondAmount(
        prefill.bondArrears.bondAmount != null ? String(prefill.bondArrears.bondAmount) : '',
      );
      setters.setBondNotes(prefill.bondArrears.notes ?? '');
    }
  }
}

function recordedArrearsKey(
  row: AgentTribunalRentChasingPrefill['arrears'][number],
  index: number,
): string {
  return `${row.caseId ?? 'row'}:${row.kind}:${row.billIndex ?? index}`;
}

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function paidItemsFromKeys(
  rows: AgentTribunalRentChasingPrefill['arrears'],
  keys: string[],
) {
  return rows.flatMap((row, index) => {
    if (!keys.includes(recordedArrearsKey(row, index)) || !row.caseId) return [];
    return [
      {
        caseId: row.caseId,
        kind: row.kind,
        ...(row.billIndex != null ? { billIndex: row.billIndex } : {}),
      },
    ];
  });
}

function billRowFromArrearsRow(
  row: AgentTribunalRentChasingPrefill['arrears'][number],
  index: number,
  prefill: AgentTribunalRentChasingPrefill,
): BillRow {
  const billIndexes = prefill.arrears
    .map((item, i) => (item.kind === 'bill' ? i : -1))
    .filter((i) => i >= 0);
  const ordinal = billIndexes.indexOf(index);
  const qualifying = prefill.billArrears.filter(
    (bill) => (bill.amount ?? 0) > 0 || Boolean(bill.dueDate),
  );
  const match =
    (ordinal >= 0 ? qualifying[ordinal] : undefined) ??
    prefill.billArrears.find(
      (bill) =>
        (bill.billName || bill.billType) === row.name &&
        (bill.amount ?? null) === (row.amount ?? null) &&
        (bill.dueDate ?? null) === (row.dueDate ?? null),
    );
  if (match) return billRowsFromPrefill([match])[0]!;
  return newBillRow({
    billType: row.name,
    billName: row.name,
    dueDate: row.dueDate ?? '',
    amount: row.amount != null ? String(row.amount) : '',
  });
}

function stashPrefillFields(
  prefill: AgentTribunalRentChasingPrefill,
  setters: {
    setRentAmount: (value: string) => void;
    setPaymentCycle: (value: RentPeriodChoice) => void;
    setRentPaidTo: (value: string) => void;
    setBills: (rows: BillRow[]) => void;
    setAgreementEndDate: (value: string) => void;
    setBondAmount: (value: string) => void;
    setBondNotes: (value: string) => void;
  },
) {
  if (prefill.rentArrears) {
    applyKindPrefill('rent', prefill, setters);
  } else {
    setters.setRentAmount('');
    setters.setRentPaidTo('');
    setters.setPaymentCycle('weekly');
  }

  setters.setBills(billRowsFromPrefill(prefill.billArrears));

  setters.setAgreementEndDate(propertyAgreementEnd(prefill));
  if (prefill.bondArrears) {
    setters.setBondAmount(
      prefill.bondArrears.bondAmount != null ? String(prefill.bondArrears.bondAmount) : '',
    );
    setters.setBondNotes(prefill.bondArrears.notes ?? '');
  } else {
    setters.setBondAmount('');
    setters.setBondNotes('');
  }
}

export function CreateTribunalRentChasingDialog({
  open,
  onOpenChange,
  propertyId: initialPropertyId,
  properties,
  mode = 'rent_chasing',
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, property is locked (opened from a property hub). */
  propertyId?: string | null;
  properties: Property[];
  /** Rent Chasing from Accounting vs Add tribunal from the Tribunal tab. */
  mode?: 'rent_chasing' | 'tribunal';
  onCreated?: (caseId: string) => void;
}) {
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rentAmount, setRentAmount] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<RentPeriodChoice>('weekly');
  const [rentPaidTo, setRentPaidTo] = useState('');
  const [bills, setBills] = useState<BillRow[]>([]);
  const [agreementEndDate, setAgreementEndDate] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [bondNotes, setBondNotes] = useState('');
  const [selectedKinds, setSelectedKinds] = useState<ArrearsKind[]>([]);
  const [selectedRecordedKeys, setSelectedRecordedKeys] = useState<string[]>(
    [],
  );
  const [selectedPaidKeys, setSelectedPaidKeys] = useState<string[]>([]);
  const [paidDate, setPaidDate] = useState(localDateInputValue);
  const [paidDateOpen, setPaidDateOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [prefill, setPrefill] = useState<AgentTribunalRentChasingPrefill | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<StripePaymentDialogState | null>(null);
  const [pendingTribunalCreate, setPendingTribunalCreate] = useState<{
    body: CreateAgentTribunalRentChasingInput;
    platformChargeId: string;
  } | null>(null);

  const { accounting, refresh } = useAgentData();
  const propertyIdsWithArrears = useMemo(
    () =>
      new Set(
        accounting.filter((row) => row.arrearsAmount > 0).map((row) => row.propertyId),
      ),
    [accounting],
  );

  const isAddingArrears = mode === 'rent_chasing';

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .filter((property) =>
          initialPropertyId
            ? property.id === initialPropertyId
            : isAddingArrears
              ? propertyIdsWithArrears.has(property.id)
              : true,
        )
        .sort((a, b) =>
          a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }),
        ),
    [initialPropertyId, properties, propertyIdsWithArrears, isAddingArrears],
  );

  const selectableKinds = useMemo(() => {
    if (isAddingArrears || !prefill?.arrears.length) {
      return ARREARS_KIND_OPTIONS.map((option) => option.id);
    }
    const recorded = new Set(prefill.arrears.map((row) => row.kind));
    return ARREARS_KIND_OPTIONS.map((option) => option.id).filter(
      (id) => !recorded.has(id),
    );
  }, [isAddingArrears, prefill]);

  const canPickRecordedArrears =
    !isAddingArrears && (prefill?.arrears.length ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    setPropertyId(initialPropertyId ?? '');
    setSelectedKinds([]);
    setSelectedRecordedKeys([]);
    setSelectedPaidKeys([]);
    setPaidDateOpen(false);
    setPrefill(null);
  }, [open, initialPropertyId]);

  useEffect(() => {
    if (!open || !propertyId) {
      if (open && !propertyId) {
        setRentAmount('');
        setPaymentCycle('weekly');
        setRentPaidTo('');
        setBills([]);
        setAgreementEndDate('');
        setBondAmount('');
        setBondNotes('');
        setPrefill(null);
        setSelectedRecordedKeys([]);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const nextPrefill = await fetchAgentTribunalRentChasingPrefill(propertyId);
        if (cancelled) return;
        setPrefill(nextPrefill);
        if (isAddingArrears) {
          setRentAmount('');
          setPaymentCycle('weekly');
          setRentPaidTo('');
          setBills([]);
          setAgreementEndDate(propertyAgreementEnd(nextPrefill));
          setBondAmount('');
          setBondNotes('');
        } else {
          stashPrefillFields(nextPrefill, {
            setRentAmount,
            setPaymentCycle,
            setRentPaidTo,
            setBills,
            setAgreementEndDate,
            setBondAmount,
            setBondNotes,
          });
          setBills([]);
        }
        setSelectedKinds([]);
        setSelectedRecordedKeys([]);
        setSelectedPaidKeys([]);
      } catch (err) {
        if (!cancelled) {
          setPrefill(null);
          if (!isAddingArrears) {
            toast.error(
              err instanceof Error ? err.message : 'Could not load accounting arrears',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, propertyId, isAddingArrears]);

  const lockedProperty = Boolean(initialPropertyId);

  const applyPropertyDefaults = (kind: ArrearsKind) => {
    const property = properties.find((item) => item.id === propertyId);

    if (kind === 'bond') {
      const agreementEnd =
        propertyAgreementEnd(prefill) || property?.leaseEnd?.slice(0, 10) || '';
      if (agreementEnd) {
        setAgreementEndDate((prev) => prev.trim() || agreementEnd);
      }
      if (property?.bondAmount) {
        setBondAmount((prev) => prev.trim() || String(property.bondAmount));
      }
      return;
    }

    if (!property) return;

    if (kind === 'rent') {
      if (property.rentWeekly) {
        setRentAmount((prev) => prev.trim() || String(property.rentWeekly));
      }
      if (property.rentPaidUntil) {
        setRentPaidTo((prev) => prev.trim() || property.rentPaidUntil!.slice(0, 10));
      }
    }
  };

  const prefillSetters = {
    setRentAmount,
    setPaymentCycle,
    setRentPaidTo,
    setBills,
    setAgreementEndDate,
    setBondAmount,
    setBondNotes,
  };

  const syncRecordedArrearsSelection = (
    nextKeys: string[],
    nextPrefill: AgentTribunalRentChasingPrefill,
    chipKinds: ArrearsKind[],
  ) => {
    setSelectedRecordedKeys(nextKeys);
    const selectedRows = nextPrefill.arrears.filter((row, index) =>
      nextKeys.includes(recordedArrearsKey(row, index)),
    );
    const recordedKinds = [
      ...new Set(selectedRows.map((row) => row.kind)),
    ] as ArrearsKind[];
    const recordedOnFile = new Set(nextPrefill.arrears.map((row) => row.kind));
    const chipOnly = chipKinds.filter((kind) => !recordedOnFile.has(kind));
    setSelectedKinds([...new Set([...recordedKinds, ...chipOnly])]);

    if (recordedKinds.includes('rent')) {
      applyKindPrefill('rent', nextPrefill, prefillSetters);
    }
    if (recordedKinds.includes('bond')) {
      applyKindPrefill('bond', nextPrefill, prefillSetters);
    }
    if (recordedOnFile.has('bill')) {
      setBills(
        nextPrefill.arrears.flatMap((row, index) =>
          row.kind === 'bill' &&
          nextKeys.includes(recordedArrearsKey(row, index))
            ? [billRowFromArrearsRow(row, index, nextPrefill)]
            : [],
        ),
      );
    }
  };

  const toggleArrearsKind = (kind: ArrearsKind) => {
    setSelectedKinds((prev) => {
      const selected = prev.includes(kind);
      if (selected) {
        if (prefill) {
          const nextKeys = selectedRecordedKeys.filter(
            (key) =>
              !prefill.arrears.some(
                (row, index) =>
                  row.kind === kind && recordedArrearsKey(row, index) === key,
              ),
          );
          setSelectedRecordedKeys(nextKeys);
          if (kind === 'bill' && prefill.arrears.some((row) => row.kind === 'bill')) {
            setBills([]);
          }
        }
        return prev.filter((item) => item !== kind);
      }
      if (prefill && !isAddingArrears) {
        applyKindPrefill(kind, prefill, prefillSetters);
        if (
          kind === 'rent' ||
          kind === 'bond'
        ) {
          const recorded = prefill.arrears.some((row) => row.kind === kind);
          if (!recorded) applyPropertyDefaults(kind);
        }
      } else {
        applyPropertyDefaults(kind);
      }
      if (kind === 'bill') {
        setBills((prevBills) => (prevBills.length > 0 ? prevBills : [newBillRow()]));
      }
      return [...prev, kind];
    });
  };

  const toggleRecordedArrears = (
    row: AgentTribunalRentChasingPrefill['arrears'][number],
    index: number,
  ) => {
    if (!prefill) return;
    const key = recordedArrearsKey(row, index);
    const nextKeys = selectedRecordedKeys.includes(key)
      ? selectedRecordedKeys.filter((item) => item !== key)
      : [...selectedRecordedKeys, key];
    syncRecordedArrearsSelection(nextKeys, prefill, selectedKinds);
  };

  const toggleAllRecordedArrears = () => {
    if (!prefill?.arrears.length) return;
    const allKeys = prefill.arrears.map((row, index) =>
      recordedArrearsKey(row, index),
    );
    const nextKeys =
      selectedRecordedKeys.length === allKeys.length ? [] : allKeys;
    syncRecordedArrearsSelection(nextKeys, prefill, selectedKinds);
  };

  const togglePaidArrears = (key: string) => {
    setSelectedPaidKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const toggleAllPaidArrears = () => {
    const rows = prefill?.arrears ?? [];
    setSelectedPaidKeys((prev) =>
      prev.length === rows.length
        ? []
        : rows.map((row, index) => recordedArrearsKey(row, index)),
    );
  };

  const openPaidDateDialog = () => {
    if (selectedPaidKeys.length === 0) {
      toast.error('Select at least one arrears row to mark paid');
      return;
    }
    setPaidDate(localDateInputValue());
    setPaidDateOpen(true);
  };

  const markSelectedArrearsPaid = async () => {
    if (!propertyId || !prefill) return;
    if (!paidDate) {
      toast.error('Choose the paid date');
      return;
    }
    const items = paidItemsFromKeys(prefill.arrears, selectedPaidKeys);
    const kinds = [
      ...new Set(
        prefill.arrears
          .filter((row, index) =>
            selectedPaidKeys.includes(recordedArrearsKey(row, index)),
          )
          .map((row) => row.kind),
      ),
    ];
    if (items.length === 0 && kinds.length === 0) {
      toast.error('Select at least one arrears row to mark paid');
      return;
    }

    setMarkingPaid(true);
    try {
      await markAgentPropertyArrearsPaid(
        propertyId,
        items.length > 0 ? { paidDate, items } : { paidDate, kinds },
      );
      toast.success('Arrears marked as paid');
      setPaidDateOpen(false);
      const nextPrefill = await fetchAgentTribunalRentChasingPrefill(propertyId);
      setPrefill(nextPrefill);
      setSelectedPaidKeys([]);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark arrears paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const dialogTitle = isAddingArrears ? 'Add arrears' : 'Add tribunal case';
  const dialogDescription = isAddingArrears
    ? 'Choose which arrears to record for this property — rent, bills, or bond — then fill in the details.'
    : 'Tick the recorded arrears to include on this tribunal case. You can also add a type that is not yet on file.';

  const submit = async () => {
    if (!propertyId) {
      toast.error('Select a property');
      return;
    }

    const rentValue = rentAmount.trim() ? Number(rentAmount) : undefined;
    const bondValue = bondAmount.trim() ? Number(bondAmount) : undefined;
    const billRows = bills
      .map((row) => {
        const billType = (row.customType ? row.billName || row.billType : row.billType).trim();
        const billName = (row.billName || billType).trim();
        const amount = row.amount.trim() ? Number(row.amount) : undefined;
        if (!billType && amount == null && !row.dueDate) return null;
        return {
          billType: billType || billName || 'Other',
          billName: billName || billType || 'Other',
          dueDate: row.dueDate || undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const hasRent =
      (rentValue != null && Number.isFinite(rentValue)) || Boolean(rentPaidTo.trim());
    const hasBills = billRows.length > 0;
    const hasBond =
      (bondValue != null && Number.isFinite(bondValue)) ||
      Boolean(agreementEndDate.trim()) ||
      Boolean(bondNotes.trim());

    if (selectedKinds.length === 0) {
      toast.error(
        canPickRecordedArrears
          ? 'Select at least one arrears item for this tribunal case'
          : 'Select at least one arrears type',
      );
      return;
    }

    if (selectedKinds.includes('rent') && !hasRent) {
      toast.error('Fill in rent arrears details');
      return;
    }
    if (selectedKinds.includes('bill') && !hasBills) {
      toast.error('Add at least one bill arrears item');
      return;
    }
    if (selectedKinds.includes('bond') && !hasBond) {
      toast.error('Fill in bond arrears details');
      return;
    }

    if (!hasRent && !hasBills && !hasBond) {
      toast.error('Select and fill in at least one of Rent, Bill, or Bond arrears');
      return;
    }

    if (rentValue != null && (!Number.isFinite(rentValue) || rentValue < 0)) {
      toast.error('Enter a valid rent amount');
      return;
    }
    if (bondValue != null && (!Number.isFinite(bondValue) || bondValue < 0)) {
      toast.error('Enter a valid bond amount');
      return;
    }
    if (!paymentCycle && rentValue != null) {
      toast.error('Select a payment cycle');
      return;
    }

    const body: CreateAgentTribunalRentChasingInput = {};
    if (selectedKinds.includes('rent') && hasRent) {
      body.rentArrears = {
        rentAmount: rentValue,
        paymentCycle: paymentCycle || undefined,
        rentPaidTo: rentPaidTo.trim() || undefined,
      };
    }
    if (selectedKinds.includes('bill') && hasBills) body.billArrears = billRows;
    if (selectedKinds.includes('bond') && hasBond) {
      body.bondArrears = {
        agreementEndDate:
          agreementEndDate.trim() || propertyAgreementEnd(prefill) || undefined,
        bondAmount: bondValue,
        notes: bondNotes.trim() || undefined,
      };
    }

    setSaving(true);
    try {
      if (isAddingArrears) {
        await createAgentPropertyArrears(propertyId, body);
        toast.success(
          'Case created. The Account Manager has been notified — wait for their response.',
        );
        const nextPrefill = await fetchAgentTribunalRentChasingPrefill(propertyId);
        setPrefill(nextPrefill);
        setSelectedKinds([]);
        setSelectedPaidKeys([]);
        setRentAmount('');
        setPaymentCycle('weekly');
        setRentPaidTo('');
        setBills([]);
        setAgreementEndDate(propertyAgreementEnd(nextPrefill));
        setBondAmount('');
        setBondNotes('');
        await refresh();
        onCreated?.('');
        return;
      }

      const prepared = await preparePlatformCharge({
        serviceType: 'tribunal',
        propertyId,
      });

      if (prepared.paymentRequired) {
        if (!getStripePublishableKey()) {
          toast.error('Card payments are not configured on this environment.');
          return;
        }

        setPendingTribunalCreate({
          body,
          platformChargeId: prepared.paymentRequired.chargeId,
        });
        setPaymentDialog({
          clientSecret: prepared.paymentRequired.clientSecret,
          title: prepared.paymentRequired.title,
          description: prepared.paymentRequired.description,
          amountAud: prepared.paymentRequired.amountAud,
          calculationDetail: prepared.paymentRequired.calculationDetail,
          calculationSummary: prepared.paymentRequired.calculationSummary,
          customerSessionClientSecret: prepared.paymentRequired.customerSessionClientSecret,
          preferSavedCard: prepared.paymentRequired.preferSavedCard,
          defaultPaymentMethod: prepared.paymentRequired.defaultPaymentMethod,
        });
        return;
      }

      await finalizeTribunalCase(body, prepared.chargeId ?? undefined);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isAddingArrears
            ? 'Could not save arrears'
            : 'Could not create tribunal case',
      );
    } finally {
      setSaving(false);
    }
  };

  const finalizeTribunalCase = async (
    body: CreateAgentTribunalRentChasingInput,
    platformChargeId?: string,
  ) => {
    if (!propertyId) return;

    const result = await createAgentTribunalRentChasing(propertyId, {
      ...body,
      ...(platformChargeId ? { platformChargeId } : {}),
    });
    toast.success(
      'Case created. The Account Manager has been notified — wait for their response.',
    );
    setPendingTribunalCreate(null);
    onOpenChange(false);
    onCreated?.(result.id);
  };

  const handleTribunalPaymentSuccess = async () => {
    if (!pendingTribunalCreate) {
      setPaymentDialog(null);
      return;
    }

    setSaving(true);
    try {
      await finalizeTribunalCase(
        pendingTribunalCreate.body,
        pendingTribunalCreate.platformChargeId,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create tribunal case');
    } finally {
      setSaving(false);
      setPaymentDialog(null);
    }
  };

  const canSubmit =
    Boolean(propertyId) &&
    selectedKinds.length > 0 &&
    !saving &&
    !markingPaid &&
    !loading &&
    !paymentDialog;

  const showArrearsForm = Boolean(propertyId) && !loading;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingTribunalCreate(null);
            setPaymentDialog(null);
          }
          onOpenChange(nextOpen);
        }}
      >
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Field label="Property">
            {lockedProperty ? (
              <p className="text-sm font-medium">
                {prefill?.propertyAddress ??
                  properties.find((p) => p.id === propertyId)?.address ??
                  'Selected property'}
              </p>
            ) : propertyOptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No properties found.</p>
            ) : (
              <select
                className={selectClass}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select property</option>
                {propertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                    {p.suburb ? `, ${p.suburb}` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading property details…
            </div>
          ) : !showArrearsForm ? (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm font-medium">Select a property</p>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                Choose a property to load arrears and continue.
              </p>
            </div>
          ) : (
            <>
              {prefill?.arrears.length ? (
                <section className="space-y-2 rounded-xl border bg-muted/20 p-4">
                  <div>
                    <p className="text-sm font-semibold">Accounting arrears</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {canPickRecordedArrears
                        ? 'Tick the arrears to include on this tribunal case.'
                        : 'Tick outstanding items to mark as paid. New arrears you add below stack onto this table.'}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-lg border bg-card">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wide">
                        <tr>
                          {canPickRecordedArrears || isAddingArrears ? (
                            <th className="w-10 px-3 py-2 font-medium">
                              <input
                                type="checkbox"
                                className="size-4 rounded border"
                                checked={
                                  isAddingArrears
                                    ? selectedPaidKeys.length ===
                                        prefill.arrears.length &&
                                      prefill.arrears.length > 0
                                    : selectedRecordedKeys.length ===
                                        prefill.arrears.length &&
                                      prefill.arrears.length > 0
                                }
                                onChange={
                                  isAddingArrears
                                    ? toggleAllPaidArrears
                                    : toggleAllRecordedArrears
                                }
                                disabled={saving || markingPaid}
                                aria-label="Select all arrears"
                              />
                            </th>
                          ) : null}
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prefill.arrears.map((row, index) => {
                          const key = recordedArrearsKey(row, index);
                          const selected = isAddingArrears
                            ? selectedPaidKeys.includes(key)
                            : selectedRecordedKeys.includes(key);
                          return (
                            <tr
                              key={key}
                              className={cn(
                                'border-t',
                                (canPickRecordedArrears || isAddingArrears) &&
                                  'cursor-pointer hover:bg-muted/30',
                                selected && 'bg-primary/5',
                              )}
                              onClick={
                                canPickRecordedArrears
                                  ? () => toggleRecordedArrears(row, index)
                                  : isAddingArrears
                                    ? () => togglePaidArrears(key)
                                    : undefined
                              }
                            >
                              {canPickRecordedArrears || isAddingArrears ? (
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    className="size-4 rounded border"
                                    checked={selected}
                                    onChange={() =>
                                      canPickRecordedArrears
                                        ? toggleRecordedArrears(row, index)
                                        : togglePaidArrears(key)
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    disabled={saving || markingPaid}
                                    aria-label={
                                      isAddingArrears
                                        ? `Mark ${row.name} as paid`
                                        : `Include ${row.name} on tribunal case`
                                    }
                                  />
                                </td>
                              ) : null}
                              <td className="px-3 py-2 capitalize">{row.kind}</td>
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2 font-medium tabular-nums">
                                {row.amount != null ? formatCurrency(row.amount) : '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground tabular-nums">
                                {row.dueDate ? formatDate(row.dueDate) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {isAddingArrears ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        saving || markingPaid || selectedPaidKeys.length === 0
                      }
                      onClick={openPaidDateDialog}
                    >
                      {markingPaid ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Mark as paid'
                      )}
                    </Button>
                  ) : null}
                  {canPickRecordedArrears &&
                  selectedRecordedKeys.length === 0 &&
                  selectableKinds.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Select at least one arrears item to continue.
                    </p>
                  ) : null}
                </section>
              ) : null}

              {selectableKinds.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isAddingArrears ? 'Arrears to add' : 'Include in tribunal case'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isAddingArrears
                    ? 'Select one or more types. Each save adds another row to the table above.'
                    : canPickRecordedArrears
                      ? 'Add a type that is not already on file, or tick items above.'
                      : 'Select one or more arrears types for this tribunal case, then complete the sections below.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ARREARS_KIND_OPTIONS.filter((option) =>
                    selectableKinds.includes(option.id),
                  ).map((option) => {
                    const selected = selectedKinds.includes(option.id);
                    return (
                      <SelectChip
                        key={option.id}
                        selected={selected}
                        onClick={() => toggleArrearsKind(option.id)}
                      >
                        {option.label}
                      </SelectChip>
                    );
                  })}
                </div>
                {selectedKinds.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {canPickRecordedArrears
                      ? 'Select recorded arrears above, or an arrears type here.'
                      : 'Select at least one arrears type to continue.'}
                  </p>
                ) : null}
              </div>
              ) : null}

              {selectedKinds.includes('rent') ? (
              <Section
                title="Rent Arrears"
                description={
                  isAddingArrears
                    ? 'Record the outstanding rent for this property.'
                    : 'From Accounting — adjust if needed before creating the case.'
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Rent">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Payment cycle">
                    <select
                      className={selectClass}
                      value={paymentCycle}
                      onChange={(e) => setPaymentCycle(e.target.value as RentPeriodChoice)}
                      disabled={saving || !propertyId}
                    >
                      {RENT_PERIOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Rent paid to" className="sm:col-span-2">
                    <Input
                      type="date"
                      value={rentPaidTo}
                      onChange={(e) => setRentPaidTo(e.target.value)}
                      disabled={saving || !propertyId}
                    />
                  </Field>
                </div>
              </Section>
              ) : null}

              {selectedKinds.includes('bill') ? (
              <Section
                title="Bill Arrears"
                description="Add one or more unpaid bills. Types can be custom."
              >
                <div className="space-y-3">
                  {bills.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No bills added yet.</p>
                  ) : (
                    bills.map((row) => (
                      <div
                        key={row.id}
                        className="space-y-2 rounded-lg border border-dashed p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Bill type">
                            <select
                              className={selectClass}
                              value={row.customType ? '__custom__' : row.billType}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id
                                      ? value === '__custom__'
                                        ? { ...b, customType: true, billType: 'Other' }
                                        : {
                                            ...b,
                                            customType: false,
                                            billType: value,
                                            billName: b.billName || value,
                                          }
                                      : b,
                                  ),
                                );
                              }}
                              disabled={saving}
                            >
                              <option value="">Select type</option>
                              {BILL_TYPE_PRESETS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                              <option value="__custom__">Add bill type…</option>
                            </select>
                          </Field>
                          <Field label="Bill name">
                            <Input
                              value={row.billName}
                              onChange={(e) =>
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id ? { ...b, billName: e.target.value } : b,
                                  ),
                                )
                              }
                              placeholder={row.customType ? 'Custom bill name' : 'Optional label'}
                              disabled={saving}
                            />
                          </Field>
                          <Field label="Bill due date">
                            <Input
                              type="date"
                              value={row.dueDate}
                              onChange={(e) =>
                                setBills((prev) =>
                                  prev.map((b) =>
                                    b.id === row.id ? { ...b, dueDate: e.target.value } : b,
                                  ),
                                )
                              }
                              disabled={saving}
                            />
                          </Field>
                          <Field label="Amount">
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.amount}
                                onChange={(e) =>
                                  setBills((prev) =>
                                    prev.map((b) =>
                                      b.id === row.id ? { ...b, amount: e.target.value } : b,
                                    ),
                                  )
                                }
                                placeholder="0.00"
                                disabled={saving}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="shrink-0"
                                onClick={() =>
                                  setBills((prev) => prev.filter((b) => b.id !== row.id))
                                }
                                disabled={saving}
                                aria-label="Remove bill"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </Field>
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setBills((prev) => [...prev, newBillRow()])}
                    disabled={saving || !propertyId}
                  >
                    <Plus className="size-3.5" />
                    Add bill
                  </Button>
                </div>
              </Section>
              ) : null}

              {selectedKinds.includes('bond') ? (
              <Section
                title="Bond Arrears"
                description="Agreement end is filled from this property’s lease. It drives days overdue once the tenant has vacated."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Agreement end date">
                    <Input
                      type="date"
                      value={agreementEndDate}
                      onChange={(e) => setAgreementEndDate(e.target.value)}
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Bond">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={bondAmount}
                      onChange={(e) => setBondAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={saving || !propertyId}
                    />
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <AgentInputFeedbackAnchor kind="internal_note" value={bondNotes}>
                      <textarea
                        value={bondNotes}
                        data-input-kind="internal_note"
                        data-allow-emoji
                        maxLength={10000}
                        onChange={bindSanitizedTextValue({
                          kind: 'internal_note',
                          allowEmoji: true,
                          onChange: (e) => setBondNotes(e.target.value),
                        })}
                        rows={3}
                        disabled={saving || !propertyId}
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Bond claim notes…"
                      />
                    </AgentInputFeedbackAnchor>
                  </Field>
                </div>
              </Section>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isAddingArrears ? 'Saving…' : 'Creating…'}
              </>
            ) : isAddingArrears ? (
              'Save arrears'
            ) : (
              'Create case'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={paidDateOpen} onOpenChange={setPaidDateOpen}>
        <DialogContent elevated className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
            <DialogDescription>
              Choose the date the tenant paid the selected arrears.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Paid date</Label>
            <Input
              type="date"
              value={paidDate}
              onChange={(event) => setPaidDate(event.target.value)}
              disabled={markingPaid}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaidDateOpen(false)}
              disabled={markingPaid}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={markingPaid || !paidDate || selectedPaidKeys.length === 0}
              onClick={() => void markSelectedArrearsPaid()}
            >
              {markingPaid ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Mark as paid'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StripePaymentDialog
        state={paymentDialog}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPaymentDialog(null);
            if (!saving) setPendingTribunalCreate(null);
          }
        }}
        onSuccess={handleTribunalPaymentSuccess}
      />
    </>
  );
}
