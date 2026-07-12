'use client';

import { AlarmClock } from 'lucide-react';

import { NeedActionTaskCard } from '@/components/agent/need-action-task-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PropertyNeedAction } from '@/lib/types';

export function PropertyRemindersDialog({
  needActions,
  open,
  onOpenChange,
}: {
  needActions: PropertyNeedAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (needActions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlarmClock className="size-5 text-amber-600" />
            Reminder
          </DialogTitle>
          <DialogDescription>
            {needActions.length} item{needActions.length === 1 ? '' : 's'} waiting on you for this
            property
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto pr-1">
          {needActions.map((action) => (
            <NeedActionTaskCard key={action.id} item={action} hidePropertyAddress />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
