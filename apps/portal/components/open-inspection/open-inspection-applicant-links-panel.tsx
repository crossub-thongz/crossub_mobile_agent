'use client';

import { useEffect, useState } from 'react';

import { OpenInspectionOpenStage } from '@/components/open-inspection/open-inspection-open-stage';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function OpenInspectionApplicantLinksPanel({
  propertyId,
  viewingSessionId,
  apiConnected,
}: {
  propertyId: string;
  viewingSessionId: string;
  apiConnected: boolean;
}) {
  const [session, setSession] = useState<OpenInspectionSession>(
    () => ({ id: viewingSessionId, propertyId }) as OpenInspectionSession,
  );

  useEffect(() => {
    if (!apiConnected) return;
    void openViewingsApi
      .get(viewingSessionId)
      .then(setSession)
      .catch(() => {
        setSession({ id: viewingSessionId, propertyId } as OpenInspectionSession);
      });
  }, [apiConnected, viewingSessionId, propertyId]);

  return <OpenInspectionOpenStage session={session} onSessionChange={setSession} />;
}
