'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  propertyCalendarDayFromDate,
  propertyCalendarDayKey,
  type PropertyCalendarEvent,
} from '@/lib/property-profile-v2-data';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

function eventTimeLabel(at: string): string {
  if (at.includes('T')) return formatDateTime(at);
  return formatDate(at);
}

const KIND_DOT: Record<PropertyCalendarEvent['kind'], string> = {
  inspection: 'bg-sky-500',
  lease: 'bg-primary',
  rent_review: 'bg-violet-500',
  end_leasing: 'bg-amber-500',
  tribunal: 'bg-rose-500',
  other: 'bg-muted-foreground',
};

export function PropertyProfileCalendarDialog({
  open,
  onOpenChange,
  propertyAddress,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyAddress: string;
  events: PropertyCalendarEvent[];
}) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PropertyCalendarEvent[]>();
    for (const event of events) {
      const key = propertyCalendarDayKey(event.at);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const daysWithEvents = useMemo(
    () =>
      Array.from(eventsByDay.keys()).map((key) => {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month - 1, day);
      }),
    [eventsByDay],
  );

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = propertyCalendarDayFromDate(today);
    if (eventsByDay.has(todayKey)) {
      setSelectedDay(today);
      return;
    }
    if (daysWithEvents.length > 0) {
      setSelectedDay(daysWithEvents[0]);
      return;
    }
    setSelectedDay(today);
  }, [open, eventsByDay, daysWithEvents]);

  const selectedKey = selectedDay ? propertyCalendarDayFromDate(selectedDay) : null;
  const selectedEvents = selectedKey ? (eventsByDay.get(selectedKey) ?? []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="text-primary size-4" />
            Property calendar
          </DialogTitle>
          <p className="text-muted-foreground truncate text-xs">{propertyAddress}</p>
        </DialogHeader>

        <div className="px-2 pb-4">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            defaultMonth={selectedDay ?? daysWithEvents[0] ?? new Date()}
            modifiers={{ scheduled: daysWithEvents }}
            modifiersClassNames={{
              scheduled:
                'relative font-semibold after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary',
            }}
            className="mx-auto"
          />

          <div className="border-border/60 mx-3 mt-2 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold">
              {selectedDay
                ? selectedDay.toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Select a Day'}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {events.length === 0
                  ? 'No upcoming scheduled tasks for this property.'
                  : 'Nothing scheduled on this day.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <li
                    key={`${event.id}-${event.at}`}
                    className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
                  >
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', KIND_DOT[event.kind])}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.label}</p>
                      {event.detail ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">{event.detail}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                        {eventTimeLabel(event.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
