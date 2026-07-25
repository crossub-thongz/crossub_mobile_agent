'use client';

import { Camera, Check, ClipboardList, Download, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  LeasingKeyCollectionState,
  LeasingKeyCollectionTenantReport,
} from '@/lib/leasing/types';
import { formatDateTime } from '@/lib/utils';

const REPORT_ROWS: {
  key: keyof LeasingKeyCollectionTenantReport;
  label: string;
}[] = [
  { key: 'keysCount', label: 'Keys' },
  { key: 'entryDoorCount', label: 'Entry door' },
  { key: 'windowSlidingCount', label: 'Window / sliding' },
  { key: 'fobsCount', label: 'Fobs' },
  { key: 'remoteControlCount', label: 'Remote controls' },
  { key: 'mailboxCount', label: 'Mailbox' },
  { key: 'othersCount', label: 'Other' },
];

function reportValue(
  report: LeasingKeyCollectionTenantReport,
  key: keyof LeasingKeyCollectionTenantReport,
): string {
  if (key === 'submittedAt' || key === 'tagNumber') return '—';
  const value = report[key];
  return value == null ? '—' : String(value);
}

function hasPhotoProof(keyCollection: LeasingKeyCollectionState): boolean {
  return (keyCollection.photos?.length ?? 0) > 0;
}

function hasTenantChecklistReport(keyCollection: LeasingKeyCollectionState): boolean {
  return keyCollection.tenantReport != null;
}

function hasKeyCollectionReport(keyCollection: LeasingKeyCollectionState): boolean {
  return hasTenantChecklistReport(keyCollection);
}

function photoFileName(url: string, index: number): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split('/').pop();
    if (base && base.includes('.')) return base;
  } catch {
    /* relative URL */
  }
  return `key-collection-photo-${index + 1}.jpg`;
}

function AvailabilityMark({ available }: { available: boolean }) {
  return (
    <span
      className={
        available
          ? 'flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
          : 'flex size-5 shrink-0 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
      }
      aria-hidden
    >
      {available ? <Check className="size-3" /> : <X className="size-3" />}
    </span>
  );
}

function EvidenceRow({
  label,
  available,
  availableLabel,
  missingLabel,
  children,
}: {
  label: string;
  available: boolean;
  availableLabel: string;
  missingLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-secondary/15 px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <AvailabilityMark available={available} />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">
            {available ? availableLabel : missingLabel}
          </p>
        </div>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{children}</div> : null}
    </div>
  );
}

export function LeasingKeyCollectionEvidencePanel({
  keyCollection,
  propertyLabel,
}: {
  keyCollection: LeasingKeyCollectionState;
  propertyLabel: string;
}) {
  const photos = keyCollection.photos ?? [];
  const report = keyCollection.tenantReport ?? null;
  const photoReady = hasPhotoProof(keyCollection);
  const reportReady = hasKeyCollectionReport(keyCollection);
  const checklistReady = hasTenantChecklistReport(keyCollection);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <div className="col-span-2 space-y-2">
        <EvidenceRow
          label="Photo proof"
          available={photoReady}
          availableLabel={
            photos.length === 1
              ? '1 photo uploaded by tenant'
              : `${photos.length} photos uploaded by tenant`
          }
          missingLabel="No photo uploaded yet"
        >
          {photoReady && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => setPhotosOpen(true)}
              >
                <Camera className="size-3" />
                View
              </Button>
              {photos.map((url, index) => (
                <Button
                  key={`${url}-${index}`}
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  asChild
                >
                  <a
                    href={url}
                    download={photoFileName(url, index)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-3" />
                    {photos.length === 1 ? 'Download' : `#${index + 1}`}
                  </a>
                </Button>
              ))}
            </>
          )}
        </EvidenceRow>

        <EvidenceRow
          label="Key collection report"
          available={reportReady}
          availableLabel={
            checklistReady
              ? report?.submittedAt
                ? `Checklist submitted ${formatDateTime(report.submittedAt)}`
                : 'Tenant handover checklist on file'
              : 'Tenant report submitted with photo proof'
          }
          missingLabel="Awaiting tenant key collection report"
        >
          {reportReady && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setReportOpen(true)}
            >
              <ClipboardList className="size-3" />
              {checklistReady ? 'View report' : 'View details'}
            </Button>
          )}
        </EvidenceRow>
      </div>

      <Dialog open={photosOpen} onOpenChange={setPhotosOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="text-base font-semibold">Key collection photos</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Photo evidence uploaded by the tenant · {propertyLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[min(60vh,32rem)] gap-3 overflow-y-auto p-6 sm:grid-cols-2">
            {photos.map((url, index) => (
              <figure
                key={`${url}-${index}`}
                className="overflow-hidden rounded-xl border border-border bg-secondary/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Key collection photo ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Photo {index + 1}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" asChild>
                    <a
                      href={url}
                      download={photoFileName(url, index)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="size-3" />
                      Download
                    </a>
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="text-base font-semibold">
              Tenant key collection report
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {checklistReady
                ? `Handover checklist from the tenant · ${propertyLabel}`
                : `Photo proof submitted by the tenant · ${propertyLabel}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto p-6">
            {checklistReady && report ? (
              <>
                {report.submittedAt && (
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDateTime(report.submittedAt)}
                  </p>
                )}
                {report.tagNumber && (
                  <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tag number
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-medium text-foreground">
                      {report.tagNumber}
                    </p>
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">Item</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REPORT_ROWS.map(({ key, label }) => (
                        <tr key={key} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 text-foreground">{label}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {reportValue(report, key)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                The tenant submitted key collection photo proof
                {keyCollection.time
                  ? ` for pickup on ${formatDateTime(keyCollection.time)}`
                  : ''}
                .
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
