'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { LeasingReferenceCheckApplicantCard } from '@/components/leasing-workflow/leasing-reference-check-applicant-card';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { resolveOpenInspectionSessionId } from '@/lib/leasing/resolve-open-inspection-session';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function LeasingStepResults({
  detail,
  onCaseClosed,
}: {
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
}) {
  const { leasingCycles, apiConnected } = useAgentData();
  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = detail.cycleId ?? cycle?.id;
  const [chosenApplicantId, setChosenApplicantId] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!apiConnected) {
      setOpenSession(null);
      return;
    }

    void (async () => {
      try {
        const sessionId = await resolveOpenInspectionSessionId(detail, { cycleId });
        if (!sessionId || cancelled) {
          if (!cancelled) setOpenSession(null);
          return;
        }
        const session = await openViewingsApi.get(sessionId);
        if (!cancelled) setOpenSession(session);
      } catch {
        if (!cancelled) setOpenSession(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiConnected, cycleId, detail]);

  const applicants = [...detail.applicationsDetail].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-sm font-semibold">Reference check</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          For each applicant, add reference-check notes and mark Recommend or Reject. Select one
          applicant to approve, confirm rent / lease start / lease term, and notify them. Email
          history and audit are shown under each applicant.
        </p>
        {detail.cycleActive === false ? (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            This new leasing case is closed — all applicant results were sent.
          </p>
        ) : null}
      </div>

      {applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="Reference check will appear here once applicants are added in the Application step."
        />
      ) : (
        <ul className="space-y-3">
          {applicants.map((app) => (
            <LeasingReferenceCheckApplicantCard
              key={app.id}
              app={app}
              detail={detail}
              openSession={openSession}
              cycleId={cycleId}
              propertyId={detail.propertyId}
              apiConnected={apiConnected}
              chosenApplicantId={chosenApplicantId}
              onChooseApplicant={setChosenApplicantId}
              onCaseClosed={onCaseClosed}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
