'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, MessageSquare, Phone, User, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { OpenInspectionVisitor } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

function CheckInRow({
  sessionId,
  visitor,
}: {
  sessionId: string;
  visitor: OpenInspectionVisitor;
}) {
  const [sending, setSending] = useState(false);
  const email = visitor.email?.trim() || '';
  const hasApplication = Boolean(visitor.application);
  const canSend = email.length > 0 && email.includes('@') && !hasApplication;

  const sendApplicationForm = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await openViewingsApi.sendApplyLink(sessionId, [email]);
      toast.success(`Application form link and QR sent to ${visitor.name || email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send application form');
    } finally {
      setSending(false);
    }
  };

  return (
    <li className="rounded-xl border bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <User className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate">{visitor.name || 'Unnamed visitor'}</span>
          </p>
          {email ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-[11px]">No email on file</p>
          )}
          {visitor.phone ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <Phone className="size-3 shrink-0" />
              {visitor.phone}
            </p>
          ) : null}
          {visitor.followUpNote?.trim() ? (
            <p className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
              <MessageSquare className="mt-0.5 size-3 shrink-0" />
              <span>{visitor.followUpNote}</span>
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 text-[11px]"
          disabled={!canSend || sending}
          onClick={() => void sendApplicationForm()}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Mail className="size-3.5" />
          )}
          {hasApplication
            ? 'Application received'
            : sending
              ? 'Sending…'
              : 'Send application form'}
        </Button>
      </div>
    </li>
  );
}

export function OpenInspectionCheckInList({
  sessionId,
  visitors,
}: {
  sessionId: string;
  visitors: OpenInspectionVisitor[];
}) {
  const checkIns = useMemo(
    () =>
      visitors.filter(
        (visitor) =>
          visitor.registrationSource === 'qr_pre_registered' ||
          visitor.registrationSource === 'walk_in',
      ),
    [visitors],
  );

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-2">
        <Users className="size-3.5 text-emerald-600 dark:text-emerald-300" />
        <p className="text-xs font-semibold uppercase tracking-wide">Check-ins</p>
        <span className="text-muted-foreground text-[11px] tabular-nums">{checkIns.length}</span>
      </div>
      {checkIns.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
          No check-ins yet. Prospects who use the check-in link will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {checkIns.map((visitor) => (
            <CheckInRow key={visitor.id} sessionId={sessionId} visitor={visitor} />
          ))}
        </ul>
      )}
    </div>
  );
}
