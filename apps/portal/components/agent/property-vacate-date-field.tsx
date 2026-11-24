'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function PropertyVacateDateField({
  date,
  initialDate,
  reason,
  onDateChange,
  onReasonChange,
  idPrefix = 'vacate',
  requireReason = false,
  allowClearWithoutReason = false,
}: {
  date: string;
  initialDate: string;
  reason: string;
  onDateChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  idPrefix?: string;
  /** Always show and require a reason when the date changes (e.g. end-leasing change vacate). */
  requireReason?: boolean;
  /** A blank date removes the recorded date, so it does not ask for a change reason. */
  allowClearWithoutReason?: boolean;
}) {
  const dateChanged = dateOnly(date) !== dateOnly(initialDate);
  const cleared = allowClearWithoutReason && !dateOnly(date);
  const showReason = (dateChanged && !cleared) || requireReason;

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Vacate date</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
      {showReason ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-reason`}>Reason for vacate date change</Label>
          <Textarea
            id={`${idPrefix}-reason`}
            inputKind="internal_note"
            rows={3}
            placeholder="Explain why the vacate date is changing"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
          <p className="text-muted-foreground text-[12px]">
            A reason is required whenever the vacate date changes.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function dateOnly(value: string): string {
  return value.trim().slice(0, 10);
}

export function vacateDateChangeInvalid(
  date: string,
  initialDate: string,
  reason: string,
): boolean {
  return dateOnly(date) !== dateOnly(initialDate) && !reason.trim();
}
