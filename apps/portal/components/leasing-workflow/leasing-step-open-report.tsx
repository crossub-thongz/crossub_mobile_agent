'use client';

import { useEffect, useState } from 'react';

import { LeasingSelfManagedOpenReports } from '@/components/leasing-workflow/leasing-self-managed-open-inspections';
import { OpenLeasingInspectionReportPanel } from '@/components/leasing-workflow/open-leasing-inspection-report-panel';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsPropertySelfManaged } from '@/hooks/use-self-managed-access';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingStepOpenReport({ detail }: { detail: LeasingPropertyDetail }) {
  const { apiConnected } = useAgentData();
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const sessionId = detail.openInspection.viewingSessionId;
  // Self-Manage, agency-run: one report per open inspection.
  const selfManaged = useIsPropertySelfManaged(detail.propertyId);
  const selfManagedOpens = selfManaged && Boolean(detail.openInspection.agentConducted);

  useEffect(() => {
    if (!apiConnected || !sessionId || selfManagedOpens) {
      setOpenSession(null);
      return;
    }
    void openViewingsApi
      .get(sessionId)
      .then(setOpenSession)
      .catch(() => setOpenSession(null));
  }, [apiConnected, sessionId, selfManagedOpens]);

  if (selfManagedOpens && detail.cycleId) {
    return <LeasingSelfManagedOpenReports detail={detail} cycleId={detail.cycleId} />;
  }

  return (
    <OpenLeasingInspectionReportPanel
      detail={detail}
      openSession={openSession}
      className="rounded-xl border bg-card p-4"
      showPending
      onSessionChange={setOpenSession}
    />
  );
}
