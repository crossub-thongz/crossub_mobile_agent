import type {
  ManagementFeeRow,
  ManagementRateGst,
} from '@/components/agent/property-management-details-section';
import {
  EMPTY_MANAGEMENT_DETAILS,
  MANAGEMENT_FEE_OPTIONS,
  syncManagementFeesToScalars,
} from '@/components/agent/property-management-details-section';
import type { Property } from '@/lib/types';

export type { ManagementFeeRow };

export type ManagementFeeUnit = 'week' | 'rate';

function normalizeGst(value: unknown): ManagementRateGst {
  return value === 'include' || value === 'exclude' ? value : '';
}

function normalizeRow(raw: unknown, index: number): ManagementFeeRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const feeType = typeof row.feeType === 'string' ? row.feeType : '';
  const amount = typeof row.amount === 'string' ? row.amount : String(row.amount ?? '');
  const id =
    typeof row.id === 'string' && row.id.trim()
      ? row.id.trim()
      : `fee-${feeType || index}-${index}`;
  return {
    id,
    feeType,
    valueMode: row.valueMode === 'rate' ? 'rate' : 'amount',
    amount,
    gst: normalizeGst(row.gst),
  };
}

export function normalizeManagementFeeRows(raw: unknown): ManagementFeeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizeRow(item, index))
    .filter((row): row is ManagementFeeRow => row != null);
}

export function managementFeesFromScalars(property: {
  administrationFee?: number | null;
  documentationFee?: number | null;
  lettingFee?: number | null;
  managementRatePercent?: number | null;
  managementRateGst?: string | null;
}): ManagementFeeRow[] {
  const rows: ManagementFeeRow[] = [];
  if (property.managementRatePercent != null) {
    rows.push({
      id: 'fee-management',
      feeType: 'management_fee',
      valueMode: 'rate',
      amount: String(property.managementRatePercent),
      gst: normalizeGst(property.managementRateGst),
    });
  }
  if (property.lettingFee != null) {
    rows.push({
      id: 'fee-letting',
      feeType: 'letting_fee',
      valueMode: 'amount',
      amount: String(property.lettingFee),
      gst: '',
    });
  }
  if (property.administrationFee != null) {
    rows.push({
      id: 'fee-admin',
      feeType: 'administration_fee',
      valueMode: 'rate',
      amount: String(property.administrationFee),
      gst: '',
    });
  }
  if (property.documentationFee != null) {
    rows.push({
      id: 'fee-documentation',
      feeType: 'tenancy_agreement_preparation_fee',
      valueMode: 'rate',
      amount: String(property.documentationFee),
      gst: '',
    });
  }
  return rows;
}

/** Resolve fee rows for the Fees tab from column, draft, or scalar fallback. */
export function resolvePropertyManagementFees(property: Property): ManagementFeeRow[] {
  const fromColumn = normalizeManagementFeeRows(property.managementFees);
  if (fromColumn.length > 0) return fromColumn;

  const draftFees = normalizeManagementFeeRows(property.registryDraft?.managementFees);
  if (draftFees.length > 0) return draftFees;

  return managementFeesFromScalars(property);
}

export function feeLabel(feeType: string): string {
  return MANAGEMENT_FEE_OPTIONS.find((o) => o.id === feeType)?.label ?? (feeType.trim() || 'Fee');
}

export function feeUnit(row: Pick<ManagementFeeRow, 'feeType' | 'valueMode'>): ManagementFeeUnit {
  const option = MANAGEMENT_FEE_OPTIONS.find((o) => o.id === row.feeType);
  if (row.valueMode === 'rate' || option?.unit === 'percent') return 'rate';
  return 'week';
}

export function valueModeForUnit(unit: ManagementFeeUnit): ManagementFeeRow['valueMode'] {
  return unit === 'rate' ? 'rate' : 'amount';
}

export function formatFeeRowDisplay(row: ManagementFeeRow): string {
  const amount = row.amount.trim();
  if (!amount) return '—';
  if (feeUnit(row) === 'week') {
    const n = Number(amount);
    const weeks = Number.isFinite(n) ? n : amount;
    return `${weeks} week${n === 1 ? '' : 's'}`;
  }
  return `${amount}%`;
}

export function formatGstLabel(gst: ManagementRateGst): string {
  if (gst === 'include') return 'Include GST';
  if (gst === 'exclude') return 'Exclude GST';
  return '—';
}

/** Build update payload for saving Fees tab edits. */
export function buildManagementFeesUpdatePayload(fees: ManagementFeeRow[]) {
  const scalars = syncManagementFeesToScalars({
    ...EMPTY_MANAGEMENT_DETAILS,
    fees,
  });
  const parseMoney = (value: string) => {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const parsePercent = (value: string) => {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  return {
    managementFees: fees,
    administrationFee: parseMoney(scalars.administrationFee),
    documentationFee: parseMoney(scalars.documentationFee),
    lettingFee: parseMoney(scalars.lettingFee),
    managementRatePercent: parsePercent(scalars.managementRatePercent),
    managementRateGst:
      scalars.managementRateGst === 'include' || scalars.managementRateGst === 'exclude'
        ? scalars.managementRateGst
        : undefined,
  };
}
