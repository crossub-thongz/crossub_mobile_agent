'use client';

import { useMemo } from 'react';

import { OpenInspectionCheckInList } from '@/components/open-inspection/open-inspection-check-in-list';
import { OpenInspectionKeyCustodySection } from '@/components/open-inspection/open-inspection-key-custody-section';
import { OpenInspectionLinkQrBlock } from '@/components/open-inspection/open-inspection-link-qr-block';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import {
  resolveOpenInspectionApplyUrl,
  resolveOpenInspectionCheckInUrl,
} from '@/lib/tenant-app-url';

export function OpenInspectionOpenStage({
  session,
  onSessionChange,
  apiConnected = true,
  inspectionId: inspectionIdOverride,
}: {
  session: OpenInspectionSession;
  onSessionChange?: (session: OpenInspectionSession) => void;
  apiConnected?: boolean;
  /** Fallback when the session payload has not yet resolved the pool inspection id. */
  inspectionId?: string | null;
}) {
  const checkInUrl = useMemo(() => resolveOpenInspectionCheckInUrl(session), [session]);
  const applyUrl = useMemo(() => resolveOpenInspectionApplyUrl(session), [session]);
  const inspectionComplete = session.sessionStatus === SessionStatusEnum.CLOSED;
  const resolvedInspectionId = inspectionIdOverride ?? session.inspectionId;

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Open</h2>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Share these links and QR codes with prospects during the viewing window.
      </p>
      <OpenInspectionKeyCustodySection
        inspectionId={resolvedInspectionId}
        apiConnected={apiConnected}
        inspectionComplete={inspectionComplete}
      />
      {checkInUrl ? (
        <>
          <OpenInspectionLinkQrBlock
            title="Check-in link & QR"
            description="For applicants to check in when they arrive at the open inspection."
            url={checkInUrl}
            qrFilename={`check-in-qr-${session.id.slice(0, 8)}.png`}
          />
          <OpenInspectionCheckInList session={session} onSessionChange={onSessionChange} />
        </>
      ) : null}
      {applyUrl ? (
        <OpenInspectionLinkQrBlock
          title="Application link & QR"
          description="For applicants to apply for this property on the tenant app."
          url={applyUrl}
          qrFilename={`apply-qr-${session.id.slice(0, 8)}.png`}
        />
      ) : null}
      {!checkInUrl && !applyUrl ? (
        <p className="text-muted-foreground text-xs">Links are not available for this session yet.</p>
      ) : null}
    </section>
  );
}
