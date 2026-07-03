'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  fetchKeyCollection,
  setKeyCollection,
  submitKeyCollectionReport,
  uploadKeyCollectionPhoto,
  type AgentKeyCollection,
  type AgentKeyCollectionReport,
} from '@/lib/crossub-api/agent-client';
import { fileToBase64, isUuid, MAX_UPLOAD_BYTES } from '@/lib/file-upload';

interface KeyCollectionFormProps {
  propertyId: string;
  onScheduled?: (time: string, location: string) => void;
  onKeyCollectionUpdated?: (kc: AgentKeyCollection) => void;
}

const COUNT_FIELDS = [
  { key: 'keysCount', label: 'Keys' },
  { key: 'entryDoorCount', label: 'Entry door' },
  { key: 'windowSlidingCount', label: 'Window / sliding' },
  { key: 'fobsCount', label: 'Fobs' },
  { key: 'remoteControlCount', label: 'Remotes' },
  { key: 'mailboxCount', label: 'Mailbox' },
  { key: 'othersCount', label: 'Others' },
] as const;

type CountKey = (typeof COUNT_FIELDS)[number]['key'];

/** Bridges Agent → Tenant App (onboarding) → Inspector (ingoing job key panel). */
export function KeyCollectionForm({
  propertyId,
  onScheduled,
  onKeyCollectionUpdated,
}: KeyCollectionFormProps) {
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('CROSSUB office');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);

  // Handover report (checklist counts + proof photos) — server-backed only.
  const [report, setReport] = useState<AgentKeyCollectionReport | null>(null);
  const [counts, setCounts] = useState<Record<CountKey, string>>({
    keysCount: '',
    entryDoorCount: '',
    windowSlidingCount: '',
    fobsCount: '',
    remoteControlCount: '',
    mailboxCount: '',
    othersCount: '',
  });
  const [tagNumber, setTagNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const applyFetched = (kc: AgentKeyCollection, notifyParent = false) => {
    if (kc.time) setTime(kc.time.slice(0, 16));
    if (kc.location) setLocation(kc.location);
    if (kc.photos?.length) setPhotos(kc.photos);
    if (kc.report) {
      setReport(kc.report);
      if (kc.report.tagNumber) setTagNumber(kc.report.tagNumber);
      setCounts((prev) => {
        const next = { ...prev };
        for (const field of COUNT_FIELDS) {
          const value = kc.report?.[field.key];
          if (value != null) next[field.key] = String(value);
        }
        return next;
      });
    }
    setLive(true);
    if (notifyParent) onKeyCollectionUpdated?.(kc);
  };

  useEffect(() => {
    if (!isUuid(propertyId)) return;
    void fetchKeyCollection(propertyId)
      .then((kc) => applyFetched(kc))
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
      const updated = await setKeyCollection(propertyId, {
        time: new Date(time).toISOString(),
        location: location.trim(),
      });
      toast.success('Key collection synced — Tenant App & Inspector updated');
      onScheduled?.(new Date(time).toISOString(), location);
      applyFetched(updated, true);
    } catch {
      toast.error('Could not save key collection');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name} is too large`);
          continue;
        }
        const contentBase64 = await fileToBase64(file);
        const { url } = await uploadKeyCollectionPhoto(propertyId, {
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          contentBase64,
        });
        urls.push(url);
      }
      if (urls.length) {
        setPhotos((prev) => [...prev, ...urls]);
        toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded`);
      }
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    setSubmittingReport(true);
    try {
      const body: Parameters<typeof submitKeyCollectionReport>[1] = { photos };
      if (tagNumber.trim()) body.tagNumber = tagNumber.trim();
      for (const field of COUNT_FIELDS) {
        const raw = counts[field.key].trim();
        if (raw === '') continue;
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed >= 0) body[field.key] = parsed;
      }
      const updated = await submitKeyCollectionReport(propertyId, body);
      setReport(updated.report ?? null);
      onKeyCollectionUpdated?.(updated);
      toast.success('Key handover report submitted');
    } catch {
      toast.error('Could not submit the report');
    } finally {
      setSubmittingReport(false);
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

      {live ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          <p className="text-xs font-medium">
            Handover report
            {report?.submittedAt ? (
              <span className="text-muted-foreground ml-1.5 font-normal">
                (submitted {new Date(report.submittedAt).toLocaleDateString()})
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-[10px]">
            Checklist counts and proof photos, materialised onto the handover record.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {COUNT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`kc-${field.key}`} className="text-[10px]">
                  {field.label}
                </Label>
                <Input
                  id={`kc-${field.key}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="h-8 text-xs"
                  value={counts[field.key]}
                  onChange={(e) =>
                    setCounts((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="kc-tag" className="text-[10px]">
                Tag number
              </Label>
              <Input
                id="kc-tag"
                className="h-8 text-xs"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="kc-photos" className="text-[10px]">
              Proof photos
            </Label>
            <Input
              id="kc-photos"
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              className="h-8 text-xs"
              onChange={(e) => {
                void uploadPhotos(e.target.files);
                e.target.value = '';
              }}
            />
            {photos.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {photos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Key handover proof"
                    className="size-12 rounded-md border object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            disabled={submittingReport || uploading}
            onClick={() => void submitReport()}
          >
            {submittingReport
              ? 'Submitting…'
              : report?.submittedAt
                ? 'Resubmit report'
                : 'Submit handover report'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
