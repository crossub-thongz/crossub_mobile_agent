'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  combineDatetimeLocal,
  formatCalendarDateKey,
  isSelectableOpenSaturday,
  parseDatetimeLocalParts,
} from '@/lib/open-inspection/open-inspection-saturday';
import { cn } from '@/lib/utils';

export function SaturdayDatetimeField({
  id,
  label,
  value,
  onChange,
  disabled,
  defaultTime = '10:00',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultTime?: string;
}) {
  const [open, setOpen] = useState(false);
  const { date: selectedDate, time } = parseDatetimeLocalParts(value);
  const timeValue = time || defaultTime;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(combineDatetimeLocal(formatCalendarDateKey(date), timeValue));
    setOpen(false);
  };

  const handleTimeChange = (nextTime: string) => {
    if (!selectedDate) return;
    onChange(combineDatetimeLocal(formatCalendarDateKey(selectedDate), nextTime));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-time`}>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                'h-9 flex-1 justify-start px-3 font-normal',
                !selectedDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="size-4 shrink-0 opacity-60" />
              {selectedDate ? format(selectedDate, 'EEE, d MMM yyyy') : 'Pick a Saturday'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => !isSelectableOpenSaturday(date)}
            />
          </PopoverContent>
        </Popover>
        <Input
          id={`${id}-time`}
          type="time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={disabled || !selectedDate}
          className="w-[7.5rem] shrink-0 bg-background"
          aria-label={`${label} time`}
        />
      </div>
    </div>
  );
}
