'use client';

import { useEffect, useState } from 'react';

import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { inspectionsApi } from '@/lib/inspections-api';
import { isInspectionDone } from '@/lib/inspections/presentation';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { Inspection } from '@/lib/types';

export function InspectionTaskDocuments({ inspection }: { inspection: Inspection }) {
  const [openReportReady, setOpenReportReady] = useState(
    inspection.type === 'OPEN' &&
      (inspection.reportStatus === 'sent' ||
        Boolean(inspection.reportUrl) ||
        inspection.status === 'Completed'),
  );

  useEffect(() => {
    if (inspection.type !== 'OPEN') return;
    let cancelled = false;
    void openViewingsApi
      .get(inspection.id)
      .then((session) => {
        if (!cancelled) setOpenReportReady(session.openReportGenerated === true);
      })
      .catch(() => {
        if (!cancelled) {
          setOpenReportReady(
            inspection.reportStatus === 'sent' ||
              Boolean(inspection.reportUrl) ||
              inspection.status === 'Completed',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    inspection.id,
    inspection.reportStatus,
    inspection.reportUrl,
    inspection.status,
    inspection.type,
  ]);

  const isOpenViewing = inspection.type === 'OPEN' && inspection.source === 'open_viewing';
  const hasRecordReport =
    Boolean(inspection.reportUrl) ||
    inspection.reportStatus === 'sent' ||
    inspection.reportStatus === 'uploaded' ||
    inspection.reportStatus === 'approved' ||
    (inspection.type === 'ROUTINE' && isInspectionDone(inspection));

  if (inspection.type === 'OPEN' && openReportReady) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Inspection report</h3>
        <InspectionReportDownloadActions
          inspectionId={inspection.id}
          reportUrl={inspection.reportUrl}
          propertyLabel={inspection.propertyAddress}
          inspectionType="open"
          fetchPdf={
            isOpenViewing ? openViewingsApi.downloadReportPdf : inspectionsApi.downloadReportPdf
          }
          variant="card"
        />
      </section>
    );
  }

  if (hasRecordReport) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Inspection report</h3>
        <InspectionReportDownloadActions
          inspectionId={inspection.id}
          reportUrl={inspection.reportUrl}
          propertyLabel={inspection.propertyAddress}
          inspectionType={
            inspection.type === 'INGOING'
              ? 'ingoing'
              : inspection.type === 'OUTGOING'
                ? 'outgoing'
                : 'routine'
          }
          variant="card"
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border v2-frosted-surface p-5">
      <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
    </section>
  );
}
