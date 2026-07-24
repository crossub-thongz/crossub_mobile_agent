'use client';

import { useMemo } from 'react';

import { PropertyOverviewJobDialog } from '@/components/agent/property-overview-job-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  inspectionJobRows,
  rentReviewJobRows,
  type PropertyJobRow,
} from '@/lib/property-job-rows';
import { resolveOpenInspectionForCycle } from '@/lib/open-inspection-resolve';
import {
  resolvePortfolioCaseContext,
  resolvePortfolioCasePropertyId,
} from '@/lib/portfolio-case-dialog';
import { useAgentStore } from '@/lib/store';

export function PortfolioCaseDialogHost({
  job,
  onClose,
  onOpenJob,
}: {
  job: PropertyJobRow | null;
  onClose: () => void;
  onOpenJob?: (job: PropertyJobRow) => void;
}) {
  const agentData = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const context = useMemo(() => {
    if (!job) return null;
    return resolvePortfolioCaseContext(job, {
      properties: agentData.properties,
      maintenanceAll: agentData.maintenanceAll,
      inspections: agentData.inspections,
      rentReviews: agentData.rentReviews,
      tenantSelections: agentData.tenantSelections,
      tribunalCases: agentData.tribunalCases,
      vacating: agentData.vacating,
      accounting: agentData.accounting,
      leasingCycles: agentData.leasingCycles,
      leasingRecords: agentData.leasingRecords,
      rentReviewDecisions,
    });
  }, [agentData, job, rentReviewDecisions]);

  if (!job || !context) return null;

  return (
    <PropertyOverviewJobDialog
      job={job}
      onClose={onClose}
      property={context.property}
      propertyId={context.propertyId}
      maintenance={context.maintenance}
      inspections={context.inspections}
      rentReviews={context.rentReviews}
      rentReviewDecisions={rentReviewDecisions}
      leasingCases={context.leasingCases}
      vacatingCases={context.vacatingCases}
      tribunalCases={context.tribunalCases}
      accounting={context.accounting}
      tenantSelections={context.tenantSelections}
      currentLease={context.currentLease}
      onViewRentReview={(reviewId) => {
        const review = context.rentReviews.find((row) => row.id === reviewId);
        if (!review) return;
        const row = rentReviewJobRows([review], rentReviewDecisions)[0];
        if (row) onOpenJob?.(row);
      }}
      onOpenInspectionCreated={(inspectionId) => {
        const openInspectionJob = (inspection: (typeof context.inspections)[number]) => {
          const row = inspectionJobRows([inspection])[0];
          if (row) onOpenJob?.(row);
        };

        const fromList = context.inspections.find((row) => row.id === inspectionId);
        if (fromList) {
          openInspectionJob(fromList);
          return;
        }

        const propertyId = resolvePortfolioCasePropertyId(job, agentData);
        if (!propertyId) return;

        void resolveOpenInspectionForCycle({
          propertyId,
          cycleId: job.kind === 'leasing' ? job.id : undefined,
          inspectionId,
        }).then((resolved) => {
          if (!resolved) return;
          agentData.registerInspection(resolved);
          openInspectionJob(resolved);
        });
      }}
    />
  );
}
