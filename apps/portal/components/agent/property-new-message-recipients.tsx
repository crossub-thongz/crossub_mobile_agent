'use client';

import { Building2, ChevronLeft, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, messageDetailParty } from '@/constants/routes';
import {
  buildPropertyMessageRecipients,
  type PropertyMessageRecipient,
} from '@/lib/property-message-recipients';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

const RECIPIENT_ICONS = {
  tenant: User,
  strata: Building2,
  building_manager: Building2,
} as const;

function RecipientRow({
  recipient,
  onSelect,
}: {
  recipient: PropertyMessageRecipient;
  onSelect: (recipient: PropertyMessageRecipient) => void;
}) {
  const Icon = RECIPIENT_ICONS[recipient.kind];
  return (
    <button
      type="button"
      onClick={() => onSelect(recipient)}
      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition hover:bg-secondary"
    >
      <Icon className="text-primary size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{recipient.label}</span>
        <span className="text-muted-foreground block truncate text-xs">{recipient.name}</span>
        {recipient.detail ? (
          <span className="text-muted-foreground block truncate text-[11px]">{recipient.detail}</span>
        ) : null}
      </span>
    </button>
  );
}

export function PropertyNewMessageRecipients({
  property,
  onBack,
  onOpened,
  className,
}: {
  property: Property;
  onBack?: () => void;
  onOpened?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { ensureMessageThread } = useAgentData();
  const recipients = buildPropertyMessageRecipients(property);

  const handleSelect = (recipient: PropertyMessageRecipient) => {
    const threadId = ensureMessageThread(property.id, {
      category: 'Others',
      subject: recipient.subject,
      caseId: `recipient:${recipient.kind}`,
    });
    if (!threadId) {
      toast.error('Could not open message thread');
      return;
    }
    const href = recipient.party
      ? messageDetailParty(threadId, recipient.party)
      : messageDetail(threadId);
    router.push(href);
    onOpened?.();
  };

  return (
    <div className={cn('space-y-2', className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1 text-xs font-medium"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
      ) : null}
      <p className="text-muted-foreground text-xs">Send a message to</p>
      {recipients.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-center text-sm">
          No tenant, strata, or building manager details on file for this property.
        </p>
      ) : (
        recipients.map((recipient) => (
          <RecipientRow key={recipient.kind} recipient={recipient} onSelect={handleSelect} />
        ))
      )}
    </div>
  );
}
