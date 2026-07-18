/** Inclusive calendar days between two ISO dates (YYYY-MM-DD). */
export function calendarDaysInclusive(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(0, days);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Period rent from weekly rent × inclusive calendar days / 7. */
export function periodRentFromWeekly(
  rentWeekly: number,
  periodStart: string,
  periodEnd: string,
): number {
  const days = calendarDaysInclusive(periodStart, periodEnd);
  if (days <= 0 || rentWeekly <= 0) return 0;
  return roundMoney((rentWeekly * days) / 7);
}

export function managementFeeAmount(rent: number, serviceRate: number): number {
  if (rent <= 0 || serviceRate <= 0) return 0;
  return roundMoney((rent * serviceRate) / 100);
}

function lineGst(
  amount: number,
  gstMode: 'include' | 'exclude',
): { exGst: number; gst: number } {
  if (gstMode === 'include') {
    const exGst = roundMoney(amount / 1.1);
    return { exGst, gst: roundMoney(amount - exGst) };
  }
  const exGst = roundMoney(amount);
  return { exGst, gst: roundMoney(amount * 0.1) };
}

export function computeInvoiceTotals(input: {
  managementFee: Array<{ amount: number; pmFeeGst: 'include' | 'exclude' }>;
  lettingTribunal: Array<{ amount: number }>;
  otherService: Array<{ amount: number }>;
}): {
  managementFee: number;
  lettingTribunal: number;
  otherService: number;
  subtotal: number;
  gst: number;
  total: number;
} {
  let managementEx = 0;
  let managementGst = 0;
  for (const line of input.managementFee) {
    const parts = lineGst(line.amount, line.pmFeeGst);
    managementEx += parts.exGst;
    managementGst += parts.gst;
  }

  let lettingEx = 0;
  let lettingGst = 0;
  for (const line of input.lettingTribunal) {
    const parts = lineGst(line.amount, 'exclude');
    lettingEx += parts.exGst;
    lettingGst += parts.gst;
  }

  let otherEx = 0;
  let otherGst = 0;
  for (const line of input.otherService) {
    const parts = lineGst(line.amount, 'exclude');
    otherEx += parts.exGst;
    otherGst += parts.gst;
  }

  const subtotal = roundMoney(managementEx + lettingEx + otherEx);
  const gst = roundMoney(managementGst + lettingGst + otherGst);
  return {
    managementFee: roundMoney(managementEx),
    lettingTribunal: roundMoney(lettingEx),
    otherService: roundMoney(otherEx),
    subtotal,
    gst,
    total: roundMoney(subtotal + gst),
  };
}

/** Display ISO date as DD/MM/YYYY. */
export function formatInvoiceDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Default invoice period: previous calendar month. */
export function defaultInvoicePeriod(today = todayIsoDate()): {
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate: string;
} {
  const [y, m] = today.split('-').map(Number);
  const endOfPrev = new Date(y, m - 1, 0);
  const startOfPrev = new Date(endOfPrev.getFullYear(), endOfPrev.getMonth(), 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const periodStart = `${startOfPrev.getFullYear()}-${pad(startOfPrev.getMonth() + 1)}-${pad(startOfPrev.getDate())}`;
  const periodEnd = `${endOfPrev.getFullYear()}-${pad(endOfPrev.getMonth() + 1)}-${pad(endOfPrev.getDate())}`;
  const due = new Date(`${periodEnd}T00:00:00`);
  due.setDate(due.getDate() + 7);
  const dueDate = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  return { periodStart, periodEnd, invoiceDate: periodEnd, dueDate };
}
