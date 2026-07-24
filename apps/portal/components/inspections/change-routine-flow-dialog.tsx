'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  routineInspectionApi,
  type ServerRoutineScheduleView,
} from '@/lib/routine-inspection-api';

const FLOW_REASONS = [
  { value: 'agent_requested_cycle', label: 'Agent requested change' },
  { value: 'tenant_overseas', label: 'Tenant overseas / unavailable' },
  { value: 'property_inaccessible', label: 'Property inaccessible' },
  { value: 'owner_request', label: 'Owner / landlord request' },
  { value: 'other', label: 'Other' },
] as const;

export function ChangeRoutineFlowDialog({
  schedule,
  open,
  onOpenChange,
  onUpdated,
}: {
  schedule: ServerRoutineScheduleView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (schedule: ServerRoutineScheduleView) => void;
}) {
  const currentFlow = schedule.flow;
  const [nextFlow, setNextFlow] = useState<'self' | 'in_person'>(
    currentFlow === 'in_person' ? 'self' : 'in_person',
  );
  const [reason, setReason] = useState<(typeof FLOW_REASONS)[number]['value']>(
    FLOW_REASONS[0].value,
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNextFlow(currentFlow === 'in_person' ? 'self' : 'in_person');
    setReason(FLOW_REASONS[0].value);
    setNote('');
  }, [open, schedule.id, currentFlow]);

  const canSave = nextFlow !== currentFlow && note.trim().length >= 10;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await routineInspectionApi.changeFlow(schedule.id, {
        flow: nextFlow,
        reason,
        reasonNote: note.trim(),
      });
      onUpdated(updated);
      toast.success('Inspection flow updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change inspection flow');
    } finally {
      setSaving(false);
    }
  };

  const currentLabel =
    currentFlow === 'self' ? 'Tenant self-inspection' : 'In-person inspector visit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change inspection flow</DialogTitle>
          <DialogDescription>
            Current mode: <span className="font-medium text-foreground">{currentLabel}</span>. Your
            reason is recorded in the case audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>New conduct mode</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={nextFlow}
              onChange={(e) => setNextFlow(e.target.value as 'self' | 'in_person')}
            >
              <option value="in_person">In-person inspector visit</option>
              <option value="self">Tenant self-inspection</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Reason category</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as (typeof FLOW_REASONS)[number]['value'])
              }
            >
              {FLOW_REASONS.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-flow-note">Reason details *</Label>
            <Textarea
              id="agent-flow-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Explain why the conduct mode is changing (min. 10 characters)…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave || saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
