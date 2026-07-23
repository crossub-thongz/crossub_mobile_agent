'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Mail, MessageSquare, Phone, User, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { OpenInspectionSession, OpenInspectionVisitor } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';

function isCheckInVisitor(visitor: OpenInspectionVisitor): boolean {
  return (
    visitor.registrationSource === 'qr_pre_registered' ||
    visitor.registrationSource === 'walk_in'
  );
}

function canReceiveApplyLink(visitor: OpenInspectionVisitor): boolean {
  const email = visitor.email?.trim() || '';
  return (
    email.length > 0 &&
    email.includes('@') &&
    !visitor.application &&
    !visitor.applyLinkSentAt
  );
}

function CheckInRow({ visitor }: { visitor: OpenInspectionVisitor }) {
  const email = visitor.email?.trim() || '';
  const hasApplication = Boolean(visitor.application);
  const alreadySent = Boolean(visitor.applyLinkSentAt);

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
        {hasApplication ? (
          <span className="text-muted-foreground shrink-0 text-[10px] font-medium">
            Application received
          </span>
        ) : alreadySent ? (
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="size-3" />
            Sent
          </span>
        ) : !email ? (
          <span className="text-muted-foreground shrink-0 text-[10px]">No email</span>
        ) : null}
      </div>
    </li>
  );
}

export function OpenInspectionCheckInList({
  session,
  onSessionChange,
}: {
  session: OpenInspectionSession;
  onSessionChange?: (session: OpenInspectionSession) => void;
}) {
  const [sending, setSending] = useState(false);

  const checkIns = useMemo(
    () => (session.visitors ?? []).filter(isCheckInVisitor),
    [session.visitors],
  );

  const pendingEmails = useMemo(
    () => [
      ...new Set(
        checkIns
          .filter(canReceiveApplyLink)
          .map((visitor) => visitor.email.trim().toLowerCase()),
      ),
    ],
    [checkIns],
  );

  const sendToAll = async () => {
    if (pendingEmails.length === 0) return;
    setSending(true);
    try {
      const result = await openViewingsApi.sendApplyLink(session.id, pendingEmails);
      onSessionChange?.(result.session);
      toast.success(
        result.sent === 1
          ? 'Application form sent to 1 check-in'
          : `Application forms sent to ${result.sent} check-ins`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send application forms');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-emerald-600 dark:text-emerald-300" />
          <p className="text-xs font-semibold uppercase tracking-wide">Check-ins</p>
          <span className="text-muted-foreground text-[11px] tabular-nums">{checkIns.length}</span>
        </div>
        {checkIns.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-[11px]"
            disabled={sending || pendingEmails.length === 0}
            onClick={() => void sendToAll()}
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            {sending
              ? 'Sending…'
              : pendingEmails.length === 0
                ? 'All forms sent'
                : pendingEmails.length === 1
                  ? 'Send application form'
                  : `Send application forms (${pendingEmails.length})`}
          </Button>
        ) : null}
      </div>
      {checkIns.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
          No check-ins yet. Prospects who use the check-in link will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {checkIns.map((visitor) => (
            <CheckInRow key={visitor.id} visitor={visitor} />
          ))}
        </ul>
      )}
    </div>
  );
}
