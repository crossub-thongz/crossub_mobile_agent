'use client';

import { useMemo, useState } from 'react';
import { Camera, X } from 'lucide-react';

import type { InspectionDetail, InspectionDetailPhoto } from '@/lib/inspections-types';
import {
  buildOutgoingAreaPhotoPairs,
  countOutgoingReportPhotos,
} from '@/lib/inspections/outgoing-report-evidence';
import { cn } from '@/lib/utils';

function PhotoSlot({
  label,
  photos,
}: {
  label: string;
  photos: InspectionDetailPhoto[];
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const primary = photos[0];

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed',
          primary ? 'border-border bg-secondary/30' : 'border-border/80 bg-secondary/10',
        )}
      >
        {primary ? (
          <button
            type="button"
            onClick={() => setPreviewUrl(primary.url)}
            className="size-full"
            aria-label={`View ${label} photo`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primary.url} alt={label} className="size-full object-cover" />
          </button>
        ) : (
          <span className="text-muted-foreground px-2 text-center text-xs">{label}</span>
        )}
      </div>
      {photos.length > 1 ? (
        <ul className="grid grid-cols-3 gap-1">
          {photos.slice(1).map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setPreviewUrl(photo.url)}
                className="aspect-square w-full overflow-hidden rounded border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Close preview"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

export function InspectionCompareEvidenceSection({
  detail,
  currentLabel = 'Outgoing photo',
  title = 'Before / after evidence',
}: {
  detail: InspectionDetail | null;
  currentLabel?: string;
  title?: string;
}) {
  const pairs = useMemo(
    () =>
      detail
        ? buildOutgoingAreaPhotoPairs(detail.areas, detail.referenceIngoing?.areas)
        : [],
    [detail],
  );
  const visible = pairs.filter(
    (p) => p.ingoingPhotos.length > 0 || p.outgoingPhotos.length > 0,
  );
  const count = countOutgoingReportPhotos(visible);

  if (!detail) return null;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
          {count > 0 ? `${count} photos` : 'Awaiting upload'}
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-xs">
          <Camera className="size-4 shrink-0" />
          Latest ingoing photos appear beside current section photos once uploaded.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((pair) => (
            <div key={pair.room} className="space-y-2">
              <p className="text-sm font-semibold">{pair.room}</p>
              <div className="grid grid-cols-2 gap-3">
                <PhotoSlot label="Ingoing" photos={pair.ingoingPhotos} />
                <PhotoSlot label={currentLabel} photos={pair.outgoingPhotos} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
