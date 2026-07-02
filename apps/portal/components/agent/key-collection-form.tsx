'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fetchKeyCollection, setKeyCollection } from '@/lib/crossub-api/agent-client';
import { isUuid } from '@/lib/file-upload';

interface KeyCollectionFormProps {
  propertyId: string;
  onScheduled?: (time: string, location: string) => void;
}

/** Bridges Agent → Tenant App (onboarding) → Inspector (ingoing job key panel). */
export function KeyCollectionForm({ propertyId, onScheduled }: KeyCollectionFormProps) {
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('CROSSUB office');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isUuid(propertyId)) return;
    void fetchKeyCollection(propertyId)
      .then((kc) => {
        if (kc.time) setTime(kc.time.slice(0, 16));
        if (kc.location) setLocation(kc.location);
        setLive(true);
      })
      .catch(() => setLive(false));
  }, [propertyId]);

  const save = async () => {
    if (!time.trim() || !location.trim()) {
      toast.error('Time and location are required');
      return;
    }
    if (!isUuid(propertyId)) {
      onScheduled?.(new Date(time).toISOString(), location);
      toast.success('Key collection saved locally');
      return;
    }
    setLoading(true);
    try {
      await setKeyCollection(propertyId, {
        time: new Date(time).toISOString(),
        location: location.trim(),
      });
      toast.success('Key collection synced — Tenant App & Inspector updated');
      onScheduled?.(new Date(time).toISOString(), location);
    } catch {
      toast.error('Could not save key collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium">
        Key handover {live ? '(live API)' : '(demo property)'}
      </p>
      <p className="text-muted-foreground text-[10px]">
        Sets the same arrangement Tenant sees under leasing onboarding and Inspector sees on the
        ingoing inspection job.
      </p>
      <div className="space-y-2">
        <Label htmlFor="kc-time" className="text-xs">
          Collection time
        </Label>
        <Input
          id="kc-time"
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kc-loc" className="text-xs">
          Location
        </Label>
        <Input id="kc-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <Button type="button" size="sm" className="h-8 text-xs" disabled={loading} onClick={() => void save()}>
        {loading ? 'Saving…' : 'Confirm key collection'}
      </Button>
    </div>
  );
}
