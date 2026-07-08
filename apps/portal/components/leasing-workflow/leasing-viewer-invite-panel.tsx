'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Plus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { BoolStatus } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import { LEASING_UI } from '@/lib/leasing/constants';
import {
  formatViewerInviteRecipient,
  parseViewerInviteInput,
  parseViewerInviteToken,
  viewerInviteChannelLabel,
} from '@/lib/leasing-viewer-invite.util';
import type { LeasingPropertyDetail, LeasingViewerInvite } from '@/lib/leasing/types';
import { cn, formatDate } from '@/lib/utils';

type DraftRecipient = { email?: string; phone?: string };

export function LeasingViewerInvitePanel({
  detail,
  onSend,
}: {
  detail: LeasingPropertyDetail;
  onSend: (recipients: DraftRecipient[]) => Promise<void>;
}) {
  const or = detail.openReport;
  const [draftInput, setDraftInput] = useState('');
  const [draftRecipients, setDraftRecipients] = useState<DraftRecipient[]>([]);
  const [sending, setSending] = useState(false);

  const sentInvites = or.viewerInvites ?? [];

  const addFromInput = () => {
    const parsed = parseViewerInviteInput(draftInput);
    if (parsed.length === 0) {
      const single = parseViewerInviteToken(draftInput);
      if (!single) {
        toast.error('Enter a valid email address or phone number');
        return;
      }
      parsed.push(single);
    }

    setDraftRecipients((prev) => {
      const keys = new Set(prev.map((r) => r.email ?? r.phone ?? ''));
      const next = [...prev];
      for (const row of parsed) {
        const key = row.email ?? row.phone ?? '';
        if (!key || keys.has(key)) continue;
        keys.add(key);
        next.push(row);
      }
      return next;
    });
    setDraftInput('');
  };

  const removeDraft = (index: number) => {
    setDraftRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = draftRecipients.length > 0 && !sending;

  const send = async () => {
    if (draftRecipients.length === 0) return;
    const count = draftRecipients.length;
    setSending(true);
    try {
      await onSend(draftRecipients);
      setDraftRecipients([]);
      setDraftInput('');
      toast.success(`Invites sent to ${count} recipient${count === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  const hubFilterHint = useMemo(
    () => `Leasing viewer invites for ${detail.propertyId}`,
    [detail.propertyId],
  );

  return (
    <div className="space-y-4">
      <BoolStatus
        done={or.viewerInvitesSent}
        doneLabel={`Invites sent${or.invitedCount ? ` to ${or.invitedCount}` : ''}`}
        pendingLabel="Invites not yet sent"
      />

      <div className="bg-background space-y-2 rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Add recipients
        </p>
        <p className="text-muted-foreground text-[11px]">
          Type an email or phone number, then press Add. Separate multiple contacts with commas or
          new lines.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draftInput}
            onChange={(e) => setDraftInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFromInput();
              }
            }}
            placeholder="email@example.com or 0412 345 678"
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1.5"
            onClick={addFromInput}
            disabled={!draftInput.trim()}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {draftRecipients.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {draftRecipients.map((r, index) => (
              <li
                key={`${r.email ?? r.phone}-${index}`}
                className="bg-secondary/40 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
              >
                {r.email ? (
                  <Mail className="text-muted-foreground size-3" />
                ) : (
                  <MessageSquare className="text-muted-foreground size-3" />
                )}
                <span>{formatViewerInviteRecipient(r)}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-background"
                  onClick={() => removeDraft(index)}
                  aria-label="Remove recipient"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
            disabled={!canSend}
            onClick={() => void send()}
          >
            <Send className="size-3.5" />
            {sending ? 'Sending…' : 'Send invites'}
          </Button>
        </div>
      </div>

      {sentInvites.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Sent invites
            </p>
            <Link href={ROUTES.MESSAGES} className="text-primary text-[11px] font-medium hover:underline">
              View in Messages
            </Link>
          </div>
          <ul className="space-y-1.5">
            {sentInvites.map((invite) => (
              <SentInviteRow key={invite.id} invite={invite} />
            ))}
          </ul>
          <p className="text-muted-foreground text-[10px]">{hubFilterHint}</p>
        </div>
      )}
    </div>
  );
}

function SentInviteRow({ invite }: { invite: LeasingViewerInvite }) {
  return (
    <li className="bg-card flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[12px]">
      <div className="min-w-0">
        <p className="truncate font-medium">{formatViewerInviteRecipient(invite)}</p>
        <p className="text-muted-foreground text-[10px]">
          {viewerInviteChannelLabel(invite.channel)} · {formatDate(invite.sentAt)}
        </p>
      </div>
      {invite.commConversationId && (
        <Link
          href={ROUTES.MESSAGES}
          className="text-primary shrink-0 text-[10px] font-medium hover:underline"
        >
          Thread
        </Link>
      )}
    </li>
  );
}
