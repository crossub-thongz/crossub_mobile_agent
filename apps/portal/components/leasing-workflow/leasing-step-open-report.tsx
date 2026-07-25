'use client';

import { useEffect, useState } from 'react';

import { OpenLeasingInspectionReportPanel } from '@/components/leasing-workflow/open-leasing-inspection-report-panel';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingStepOpenReport({ detail }: { detail: LeasingPropertyDetail }) {
  const { apiConnected } = useAgentData();
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const sessionId = detail.openInspection.viewingSessionId;

  useEffect(() => {
    if (!apiConnected || !sessionId) {
      setOpenSession(null);
      return;
    }
    void openViewingsApi
      .get(sessionId)
      .then(setOpenSession)
      .catch(() => setOpenSession(null));
  }, [apiConnected, sessionId]);

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
