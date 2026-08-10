'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveNoticePayableFromDate } from '@/lib/rent-review/scheduling';
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
        disabled={disabled || saving}
        onChange={(e) => setPayableFrom(e.target.value)}
        onBlur={() => void save(payableFrom)}
      />
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Suggested from lease end or 60 days after notice delivery. Edit before sending if the
        auto-filled date is not correct.
      </p>
    </div>
  );
}
