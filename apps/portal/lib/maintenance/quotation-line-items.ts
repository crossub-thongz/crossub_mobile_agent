import type { ApiQuotation } from '@/lib/crossub-api/types';

export type QuotationLineGstMode = 'include' | 'exclude';

export const DEFAULT_GST_PERCENT = 10;

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  gstMode?: QuotationLineGstMode;
  gstPercent?: number;
  unitPriceExGst: number;
  gst: number;
  amountIncGst: number;
}

export interface QuotationTotals {
  subtotalExGst: number;
  totalGst: number;
  totalIncGst: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveLineGstPercent(line: Pick<QuotationLineItem, 'gstPercent'>): number {
  return typeof line.gstPercent === 'number' ? line.gstPercent : DEFAULT_GST_PERCENT;
}

export function resolveLineGstMode(line: Pick<QuotationLineItem, 'gstMode' | 'gstPercent'>): QuotationLineGstMode {
  if (resolveLineGstPercent(line) === 0) return 'exclude';
  return line.gstMode === 'include' ? 'include' : 'exclude';
}

export function displayUnitPrice(line: QuotationLineItem): number {
  const mode = resolveLineGstMode(line);
  return mode === 'include'
    ? round2(line.amountIncGst / Math.max(1, line.quantity))
    : line.unitPriceExGst;
}

export function gstModeLabel(mode?: QuotationLineGstMode, gstPercent?: number): string {
  const percent = typeof gstPercent === 'number' ? gstPercent : DEFAULT_GST_PERCENT;
  if (percent === 0) return 'No GST (0%)';
  if (mode === 'include') return `Include GST (${percent}%)`;
  return `Exclude GST (${percent}%)`;
}

export function totalsFromLineItems(lines: QuotationLineItem[]): QuotationTotals {
  const subtotalExGst = round2(lines.reduce((sum, line) => sum + line.unitPriceExGst * line.quantity, 0));
  const totalGst = round2(lines.reduce((sum, line) => sum + line.gst, 0));
  const totalIncGst = round2(lines.reduce((sum, line) => sum + line.amountIncGst, 0));
  return { subtotalExGst, totalGst, totalIncGst };
}

function normalizeLineItem(
  raw: Partial<QuotationLineItem> & { amount?: number },
  index: number,
): QuotationLineItem | null {
  const description = raw.description?.trim();
  if (!description) return null;

  const quantity = raw.quantity && raw.quantity > 0 ? raw.quantity : 1;
  const gstMode = raw.gstMode === 'include' ? 'include' : 'exclude';
  const gstPercent = resolveLineGstPercent(raw);

  if (
    typeof raw.unitPriceExGst === 'number' &&
    typeof raw.gst === 'number' &&
    typeof raw.amountIncGst === 'number' &&
    raw.amountIncGst > 0
  ) {
    return {
      id: raw.id ?? String(index + 1),
      description,
      quantity,
      gstMode,
      gstPercent,
      unitPriceExGst: raw.unitPriceExGst,
      gst: raw.gst,
      amountIncGst: raw.amountIncGst,
    };
  }

  const amountIncGst = raw.amountIncGst ?? raw.amount ?? 0;
  if (!amountIncGst || amountIncGst <= 0) return null;

  const unitPriceExGst =
    typeof raw.unitPriceExGst === 'number' && raw.unitPriceExGst > 0
      ? raw.unitPriceExGst
      : round2(amountIncGst / (1 + gstPercent / 100) / quantity);
  const gst =
    typeof raw.gst === 'number' && raw.gst > 0
      ? raw.gst
      : round2(amountIncGst - unitPriceExGst * quantity);

  return {
    id: raw.id ?? String(index + 1),
    description,
    quantity,
    gstMode,
    gstPercent,
    unitPriceExGst,
    gst,
    amountIncGst: round2(unitPriceExGst * quantity + gst),
  };
}

/** Build table rows from stored line items or fall back to scope + price. */
export function buildQuotationLineItems(
  quote: Pick<ApiQuotation, 'price' | 'scope' | 'lineItems'>,
): {
  lines: QuotationLineItem[];
  totals: QuotationTotals;
} {
  if (quote.lineItems?.length) {
    const lines = quote.lineItems
      .map((line, index) => normalizeLineItem(line, index))
      .filter((line): line is QuotationLineItem => line != null);
    if (lines.length > 0) {
      return { lines, totals: totalsFromLineItems(lines) };
    }
  }

  const totalIncGst = quote.price;
  const descriptions = quote.scope
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  const rows = descriptions.length > 0 ? descriptions : [quote.scope?.trim() || 'Repair works'];
  const totalExGst = round2(totalIncGst / 1.1);
  const perLineExGst = round2(totalExGst / rows.length);

  const lines = rows.map((description, index) => {
    const isLast = index === rows.length - 1;
    const unitPriceExGst = isLast
      ? round2(totalExGst - perLineExGst * (rows.length - 1))
      : perLineExGst;
    const gst = round2(unitPriceExGst * 0.1);
    const amountIncGst = round2(unitPriceExGst + gst);

    return {
      id: String(index + 1),
      description,
      quantity: 1,
      gstMode: 'exclude' as const,
      gstPercent: DEFAULT_GST_PERCENT,
      unitPriceExGst,
      gst,
      amountIncGst,
    };
  });

  return {
    lines,
    totals: totalsFromLineItems(lines),
  };
}
