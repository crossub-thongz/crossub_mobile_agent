'use client';

import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { OpenInspectionApplicantPanel } from '@/components/open-inspection/open-inspection-applicant-panel';
import { OpenInspectionOpenStage } from '@/components/open-inspection/open-inspection-open-stage';
import { OpenInspectionReportStage } from '@/components/open-inspection/open-inspection-report-stage';
import { OpenInspectionScheduledStage } from '@/components/open-inspection/open-inspection-scheduled-stage';
import { Button } from '@/components/ui/button';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  OPEN_SESSION_RAIL_STEP,
  canCompleteOpenSessionReview,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function OpenInspectionStagePanel({
  session,
  propertyLabel,
  viewedStep,
  onSessionChange,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
  viewedStep: OpenSessionRailStep;
  onSessionChange: (session: OpenInspectionSession) => void;
}) {
  const reportReady = session.openReportGenerated === true;
  const canCompleteReview = canCompleteOpenSessionReview(session);
  const applicantsWithApplications = session.visitors.filter((v) => v.application);

  return (
    <div className="space-y-4">
      {viewedStep === OPEN_SESSION_RAIL_STEP.SCHEDULED ? (
        <OpenInspectionScheduledStage session={session} />
      ) : null}

      {viewedStep === OPEN_SESSION_RAIL_STEP.OPEN ? (
        <>
          <OpenInspectionOpenStage session={session} />
          {applicantsWithApplications.length > 0 || !reportReady ? (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">
                Applicants ({applicantsWithApplications.length})
              </h2>
              <OpenInspectionApplicantPanel
                session={session}
                onSessionChange={onSessionChange}
                readOnly
              />
              {!reportReady ? (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!canCompleteReview}
                    onClick={async () => {
                      try {
                        const updated = await openViewingsApi.completeReview(session.id);
                        onSessionChange(updated);
                        toast.success('Review complete — open report generated');
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : 'Could not complete review',
                        );
                      }
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Complete review & generate report
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {viewedStep === OPEN_SESSION_RAIL_STEP.REPORT ? (
        <OpenInspectionReportStage session={session} propertyLabel={propertyLabel} />
      ) : null}
    </div>
  );
}
