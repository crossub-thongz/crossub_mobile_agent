'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SELF_MANAGED_LEASING_COPY as COPY } from '@/constants/self-managed-leasing';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import { setSelfManagedBondLink } from '@/lib/crossub-api/agent-workflow-client';

const SEND_BOND_LINK = 'bond-link';

/** Self-Manage bond: the agent pastes the lodgement link; saving emails it to the tenant. */
export function LeasingSelfManagedBondLink({
  propertyId,
  cycleId,
  currentLink,
}: {
  propertyId: string;
  cycleId?: string;
  currentLink?: string;
}) {
  const { pending, run } = useSelfManagedLettingAction(propertyId, cycleId);
  const [link, setLink] = useState(currentLink ?? '');

  const send = async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      toast.error(COPY.bondLinkEmpty);
      return;
    }
    await run(
      SEND_BOND_LINK,
      (id) => setSelfManagedBondLink(propertyId, id, { link: trimmed }),
      COPY.bondLinkSent,
    );
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={`bond-link-${propertyId}`} className="text-xs">
        {COPY.bondLinkLabel}
      </Label>
      <div className="flex flex-col gap-1.5 sm:flex-row">
        <Input
          id={`bond-link-${propertyId}`}
          type="url"
          inputMode="url"
          value={link}
          placeholder={COPY.bondLinkPlaceholder}
          onChange={(e) => setLink(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 gap-1 text-xs"
          disabled={pending !== null || !link.trim()}
          onClick={() => void send()}
        >
          <Send className="size-3.5" />
          {pending === SEND_BOND_LINK
            ? COPY.sending
            : currentLink
              ? COPY.bondLinkResend
              : COPY.bondLinkSend}
        </Button>
      </div>
    </div>
  );
}
