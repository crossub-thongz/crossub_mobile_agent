import type { ApiQuotation } from '@/lib/crossub-api/types';

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
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

/** Build table rows from the shared maintenance quotation scope + price. */
export function buildQuotationLineItems(quote: Pick<ApiQuotation, 'price' | 'scope'>): {
  lines: QuotationLineItem[];
  totals: QuotationTotals;
} {
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
      unitPriceExGst,
      gst,
      amountIncGst,
    };
  });

  const subtotalExGst = round2(lines.reduce((sum, line) => sum + line.unitPriceExGst, 0));
  const totalGst = round2(lines.reduce((sum, line) => sum + line.gst, 0));

  return {
    lines,
    totals: {
      subtotalExGst,
      totalGst,
      totalIncGst: round2(totalIncGst),
    },
  };
}
