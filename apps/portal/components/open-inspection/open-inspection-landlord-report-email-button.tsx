'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SessionStatusEnum, type OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

export function OpenInspectionLandlordReportEmailButton({
  session,
  onSessionChange,
  className,
}: {
  session: OpenInspectionSession;
  onSessionChange?: (session: OpenInspectionSession) => void;
  className?: string;
}) {
  const [sending, setSending] = useState(false);
  const autoSendAttemptedRef = useRef<string | null>(null);
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  const landlordEmail = session.landlord?.email?.trim() || '';
  const alreadySent = Boolean(session.landlordReportEmailedAt?.trim());
  const sentTo = session.landlordReportEmailedTo?.trim() || landlordEmail;
  const sessionClosed = session.sessionStatus === SessionStatusEnum.CLOSED;

  const sendToLandlord = async () => {
    if (alreadySent) return;
    setSending(true);
    try {
      const result = await openViewingsApi.sendReportToLandlord(
        session.id,
        landlordEmail || undefined,
      );
      onSessionChangeRef.current?.(result.session);
      toast.success('Open report emailed to landlord');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not email the report');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (alreadySent || !session.openReportGenerated || sessionClosed) return;
    if (autoSendAttemptedRef.current === session.id) return;
    autoSendAttemptedRef.current = session.id;

    let cancelled = false;
    void (async () => {
      setSending(true);
      try {
        const result = await openViewingsApi.sendReportToLandlord(
          session.id,
          landlordEmail || undefined,
        );
        if (!cancelled) onSessionChangeRef.current?.(result.session);
      } catch {
        /* Manual retry remains available when no landlord email is on file. */
      } finally {
        setSending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alreadySent, landlordEmail, session.id, session.openReportGenerated, sessionClosed]);

  return (
    <div className={className}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        disabled={alreadySent || sending}
        onClick={() => void sendToLandlord()}
      >
        {sending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Mail className="size-3.5" />
        )}
        {alreadySent
          ? 'Sent to landlord'
          : sending
            ? 'Sending…'
            : 'Email report to landlord'}
      </Button>
      {alreadySent && sentTo ? (
        <p className="text-muted-foreground mt-1 text-xs">Sent to {sentTo}</p>
      ) : landlordEmail ? (
        <p className="text-muted-foreground mt-1 text-xs">Sends to {landlordEmail}</p>
      ) : (
        <p className="text-muted-foreground mt-1 text-xs">
          Uses the landlord email on file for this property.
        </p>
      )}
    </div>
  );
}
