'use client';

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { cn } from '@/lib/utils';

export type RoutineSelfPreviousSubmission = {
  submittedAt: string;
  reportUrl: string | null;
  sections: Array<{
    id: string;
    room: string;
    description: string;
    photos: string[];
  }>;
};

export function RoutineSelfPreviousSubmissionSection({
  submission,
  propertyLabel,
  inspectionRecordId,
  declineReason,
  defaultOpen = false,
  className,
}: {
  submission: RoutineSelfPreviousSubmission;
  propertyLabel: string;
  inspectionRecordId?: string | null;
  declineReason?: string | null;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionCount = submission.sections.length;
  const photoCount = submission.sections.reduce(
    (total, section) => total + section.photos.length,
    0,
  );

  return (
    <section className={cn('rounded-2xl border bg-card', className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <p className="text-sm font-semibold">First tenant submission</p>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {sectionCount} area{sectionCount === 1 ? '' : 's'} · {photoCount} photo
            {photoCount === 1 ? '' : 's'}
            {declineReason ? ' · declined — awaiting resubmit' : ''}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t px-4 py-3">
          {declineReason ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs">
              Decline reason: {declineReason}
            </p>
          ) : null}
          {submission.reportUrl && inspectionRecordId ? (
            <InspectionReportDownloadActions
              inspectionId={inspectionRecordId}
              propertyLabel={propertyLabel}
              inspectionType="routine"
              canDownload
              variant="inline"
            />
          ) : null}
          <div className="space-y-3">
            {submission.sections.map((section) => (
              <div key={section.id} className="rounded-xl border bg-background/60 p-3">
                <p className="text-sm font-medium">{section.room}</p>
                {section.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">{section.description}</p>
                ) : null}
                {section.photos.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {section.photos.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${section.room} photo`}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">No photos uploaded.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
