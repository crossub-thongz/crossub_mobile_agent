'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tenantNoticeServedAt } from '@/lib/rent-review/agent-workflow-model';
import {
  earliestCompliantRentIncreaseDate,
  RENT_REVIEW_STATUTORY_NOTICE_DAYS,
  resolveNoticePayableFromDate,
} from '@/lib/rent-review/scheduling';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewNoticePayableFromField({
  detail,
  onSave,
  disabled,
}: {
  detail: RentReviewWorkflowDetail;
  onSave: (payableFrom: string) => Promise<RentReviewWorkflowDetail>;
  disabled?: boolean;
}) {
  const defaultPayableFrom = useMemo(
    () =>
      resolveNoticePayableFromDate({
        leaseEndDate: detail.leaseEndDate,
        storedEffectiveDate: detail.effectiveDate,
      }),
    [detail.effectiveDate, detail.leaseEndDate],
  );

  // Measured from the notice already served where there is one, so correcting this field a
  // week after dispatch does not demand a date a week later than the notice itself required.
  const earliestIncreaseDate = useMemo(
    () => earliestCompliantRentIncreaseDate(tenantNoticeServedAt(detail)),
    [detail],
  );

  const [payableFrom, setPayableFrom] = useState(defaultPayableFrom);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPayableFrom(defaultPayableFrom);
  }, [defaultPayableFrom, detail.id]);

  const save = async (next: string) => {
    if (!next || next === detail.effectiveDate) return;
    setSaving(true);
    try {
      await onSave(next);
      toast.success('Notice payable-from date saved');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setPayableFrom(detail.effectiveDate ?? defaultPayableFrom);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`notice-payable-${detail.id}`} className="text-xs font-semibold">
          NSW notice — Payable from
        </Label>
        {saving ? <Loader2 className="text-muted-foreground size-3.5 animate-spin" /> : null}
      </div>
      <Input
        id={`notice-payable-${detail.id}`}
        type="date"
        value={payableFrom}
        min={earliestIncreaseDate}
        disabled={disabled || saving}
        onChange={(e) => setPayableFrom(e.target.value)}
        onBlur={() => void save(payableFrom)}
      />
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Suggested from lease end, or the statutory minimum. Earliest permitted is{' '}
        <span className="font-medium tabular-nums">{earliestIncreaseDate}</span> —{' '}
        {RENT_REVIEW_STATUTORY_NOTICE_DAYS} days notice counted from the day after the notice is
        served.
      </p>
    </div>
  );
}
