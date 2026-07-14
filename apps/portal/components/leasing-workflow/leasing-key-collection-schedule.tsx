'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { setKeyCollection as setKeyCollectionAgent } from '@/lib/crossub-api/agent-client';
import { isUuid } from '@/lib/file-upload';
import { LEASING_KEY_CUSTODY } from '@/lib/leasing/constants';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function LeasingKeyCollectionSchedule({
  detail,
  cycleId,
}: {
  detail: LeasingPropertyDetail;
  cycleId?: string;
}) {
  const propertyId = detail.propertyId;
  const store = useLeasingWorkflowStore();
  const { apiConnected } = useAgentData();
  const keyByCrossub = detail.agentInfo.keyCustody === LEASING_KEY_CUSTODY.CROSSUB;
  const existing = detail.onboarding.keyCollection;

  const [time, setTime] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing.time) setTime(toLocalDatetimeInput(existing.time));
    if (existing.timeEnd) setTimeEnd(toLocalDatetimeInput(existing.timeEnd));
    if (existing.location) {
      setLocation(existing.location);
    } else if (keyByCrossub) {
      setLocation('CROSSUB office');
    }
  }, [existing.time, existing.timeEnd, existing.location, keyByCrossub]);

  const save = async () => {
    if (!time.trim() || !location.trim()) {
      toast.error('Enter start time and location');
      return;
    }
    if (timeEnd && new Date(timeEnd) <= new Date(time)) {
      toast.error('End time must be after start time');
      return;
    }
    const isoTime = new Date(time).toISOString();
    const isoTimeEnd = timeEnd ? new Date(timeEnd).toISOString() : undefined;
    const trimmedLocation = location.trim();
    setSaving(true);
    try {
      const payload = { time: isoTime, location: trimmedLocation, timeEnd: isoTimeEnd };
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.setKeyCollection(cycleId, payload);
        store.applyCycleView(propertyId, view);
      } else if (isUuid(propertyId)) {
        const updated = await setKeyCollectionAgent(propertyId, payload);
        store.applyKeyCollectionFromApi(propertyId, updated);
      } else {
        store.setKeyCollection(propertyId, isoTime, trimmedLocation, isoTimeEnd);
      }
      toast.success('Key collection sent to tenant');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save key collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-secondary/10 p-3">
      <p className="text-xs font-medium">Send key collection details to tenant</p>
      <p className="text-muted-foreground text-[10px] leading-relaxed">
        The tenant will see this date, time window, and location in their onboarding checklist.
      </p>
      <div className="space-y-2">
        <Label htmlFor="kc-time" className="text-xs">
          Start time
        </Label>
        <Input
          id="kc-time"
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kc-time-end" className="text-xs">
          End time (optional)
        </Label>
        <Input
          id="kc-time-end"
          type="datetime-local"
          value={timeEnd}
          onChange={(e) => setTimeEnd(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kc-location" className="text-xs">
          Location
        </Label>
        <Input
          id="kc-location"
          value={location}
          placeholder={
            keyByCrossub ? 'CROSSUB office address' : 'Agent office or property address'
          }
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="h-8 w-full text-xs"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Sending…' : existing.time ? 'Update key collection' : 'Send to tenant'}
      </Button>
    </div>
  );
}
