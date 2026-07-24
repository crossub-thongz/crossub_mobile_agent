'use client';

import { ChevronRight, Loader2 } from 'lucide-react';

import type { InspectionDetail, InspectionDetailArea } from '@/lib/inspections-types';
import { isReportPhotoUrl } from '@/lib/inspections/outgoing-report-evidence';
import { cn } from '@/lib/utils';

const CONDITION_LABEL: Record<string, string> = {
  CLEAN_TIDY: 'Excellent',
  GOOD: 'Good',
  ABOVE_SATISFACTORY: 'Good',
  SATISFACTORY: 'Fair',
  FAIR: 'Fair',
  AS_INDICATED: 'Fair',
  MESSY: 'Poor',
  POOR: 'Poor',
  UNRATED: '—',
};

function areaConditionLabel(area: InspectionDetailArea): string {
  if (area.ratingRaw?.trim()) return area.ratingRaw;
  return CONDITION_LABEL[area.rating] ?? area.rating.replaceAll('_', ' ');
}

function areaComments(area: InspectionDetailArea): string | null {
  const notes = area.items.find(
    (item) => item.name?.toLowerCase() === 'notes' && item.comment?.trim(),
  );
  if (notes?.comment) return notes.comment;
  const joined = area.items
    .map((item) => item.comment?.trim())
    .filter(Boolean)
    .join(' · ');
  return joined || null;
}

function areaPhotos(area: InspectionDetailArea) {
  return [
    ...area.photos,
    ...area.items.flatMap((item) => item.photos),
  ].filter((photo) => isReportPhotoUrl(photo.url));
}

function orderedAreas(detail: InspectionDetail): InspectionDetailArea[] {
  return [...detail.areas].sort(
    (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
  );
}

function AreaNode({
  area,
  isLast,
}: {
  area: InspectionDetailArea;
  isLast: boolean;
}) {
  const label = area.name?.trim() || 'Area';
  const photos = areaPhotos(area);
  const condition = areaConditionLabel(area);
  const comments = areaComments(area);
  const sectionItems = area.items.filter(
    (item) => item.name?.trim() && item.name.toLowerCase() !== 'notes',
  );

  return (
    <li className="relative pl-4">
      {!isLast ? (
        <span
          className="absolute top-3 left-[5px] h-[calc(100%+0.5rem)] w-px bg-border"
          aria-hidden
        />
      ) : null}
      <span
        className="absolute top-2.5 left-0 size-[11px] rounded-full border-2 border-primary/40 bg-background"
        aria-hidden
      />
      <div className="rounded-lg border border-border/80 bg-card/50 p-3">
        <div className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 text-primary" />
          <p className="text-sm font-semibold">{label}</p>
        </div>

        <div className="mt-3 space-y-3">
          {photos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary/40 block size-14 shrink-0 overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="size-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No photos for this area</p>
          )}

          <p className="text-xs">
            <span className="font-medium">Condition:</span>{' '}
            <span
              className={cn(
                condition === 'Damaged' || condition === 'Poor'
                  ? 'text-destructive'
                  : condition === 'Excellent' || condition === 'Good'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-muted-foreground',
              )}
            >
              {condition}
            </span>
          </p>

          {comments ? (
            <p className="text-muted-foreground text-xs">
              <span className="font-medium text-foreground">Comments:</span> {comments}
            </p>
          ) : null}

          {sectionItems.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                Sections
              </p>
              <ul className="text-muted-foreground text-xs">
                {sectionItems.map((item) => (
                  <li key={item.id}>• {item.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function IngoingReportFindingsSection({
  detail,
  isLoading,
}: {
  detail: InspectionDetail | null;
  isLoading?: boolean;
}) {
  if (isLoading && !detail) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Loading ingoing report…
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="text-muted-foreground text-xs">
        Waiting for the inspector to complete the room-by-room ingoing report.
      </p>
    );
  }

  const areas = orderedAreas(detail);
  if (areas.length === 0 && detail.inspectionPhotos.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No findings synced yet — the inspector must capture each area and submit the report.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {areas.length > 0 ? (
        <ul className="space-y-3">
          {areas.map((area, index) => (
            <AreaNode key={area.id} area={area} isLast={index === areas.length - 1} />
          ))}
        </ul>
      ) : null}

      {detail.inspectionPhotos.filter((photo) => isReportPhotoUrl(photo.url)).length > 0 ? (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wider">
            General inspection photos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {detail.inspectionPhotos
              .filter((photo) => isReportPhotoUrl(photo.url))
              .map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary/40 block size-14 shrink-0 overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="size-full object-cover" />
                </a>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
