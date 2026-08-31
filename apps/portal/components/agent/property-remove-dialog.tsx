'use client';

import { useEffect, useState } from 'react';
import { Archive, CalendarMinus, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Property } from '@/lib/types';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

type RemoveMode = 'end-management' | 'archive' | 'delete';

function OptionCard({
  selected,
  title,
  description,
  icon: Icon,
  tone,
  disabled,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: typeof Archive;
  tone: 'neutral' | 'destructive';
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        selected
          ? tone === 'destructive'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/30 hover:bg-muted/30',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
            tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">{description}</span>
        </span>
      </div>
    </button>
  );
}

export function PropertyRemoveDialog({
  property,
  open,
  onOpenChange,
  onEndManagement,
  onArchive,
  onDeletePermanently,
  saving,
}: {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndManagement: (endOfManagementDate: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onDeletePermanently: () => Promise<void>;
  saving?: boolean;
}) {
  const isDraft = property?.registryIntakeComplete === false;
  const [mode, setMode] = useState<RemoveMode>(isDraft ? 'delete' : 'end-management');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(isDraft ? 'delete' : 'end-management');
    setEndDate('');
  }, [open, property?.id, isDraft]);

  const submit = async () => {
    if (mode === 'end-management') {
      if (!endDate.trim()) return;
      await onEndManagement(endDate);
      return;
    }
    if (mode === 'archive') {
      await onArchive();
      return;
    }
    await onDeletePermanently();
  };

  const canSubmit =
    mode === 'end-management' ? endDate.trim().length > 0 : true;

  const submitLabel =
    mode === 'delete' ? 'Delete permanently' : mode === 'archive' ? 'Archive' : 'End management';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove property</DialogTitle>
          <DialogDescription>
            {property
              ? `Choose how to remove ${formatPropertyFullAddress(property)} from your active portfolio.`
              : 'Choose how to remove this property.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <OptionCard
            selected={mode === 'end-management'}
            title="End of management"
            description={
              isDraft
                ? 'Available after the property registration is completed.'
                : 'Records the end date on Overview. The property stays on your active portfolio until you archive it.'
            }
            icon={CalendarMinus}
            tone="neutral"
            disabled={isDraft}
            onSelect={() => setMode('end-management')}
          />

          {mode === 'end-management' && !isDraft ? (
            <div className="ml-1 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Label htmlFor="end-of-management-date">End of management date</Label>
              <Input
                id="end-of-management-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving}
              />
            </div>
          ) : null}

          <OptionCard
            selected={mode === 'archive'}
            title="Archive"
            description={
              isDraft
                ? 'Available after the property registration is completed.'
                : 'Moves the property to Archived for history, reporting, and reference. It leaves the active list.'
            }
            icon={Archive}
            tone="neutral"
            disabled={isDraft}
            onSelect={() => setMode('archive')}
          />

          <OptionCard
            selected={mode === 'delete'}
            title="Delete permanently"
            description={
              isDraft
                ? 'Removes this incomplete draft entirely — it will not appear in Archived.'
                : 'Removes the property completely. Use when it was added by mistake and has no workflow history. It will not appear in Archived.'
            }
            icon={Trash2}
            tone="destructive"
            onSelect={() => setMode('delete')}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={mode === 'delete' ? 'destructive' : 'default'}
            disabled={!canSubmit || saving}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
