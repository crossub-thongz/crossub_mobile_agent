'use client';

import { AtSign, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { OWNER_EMAIL_SENDER_COPY } from '@/constants/service-plan';
import { selfManagedAgencies } from '@/lib/portal-service-level';
import type { Agency } from '@/lib/types';

async function copyAddress(address: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(address);
    toast.success(OWNER_EMAIL_SENDER_COPY.copied);
  } catch {
    toast.error(OWNER_EMAIL_SENDER_COPY.copyFailed);
  }
}

function AgencySenderRow({ agency, showAgencyName }: { agency: Agency; showAgencyName: boolean }) {
  const address = agency.inboundEmailAddress;
  return (
    <div className="rounded-xl border bg-card p-4">
      {showAgencyName ? <p className="mb-2 truncate text-sm font-semibold">{agency.name}</p> : null}
      {address ? (
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <AtSign className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-xs">{agency.name}</p>
            <p className="text-sm font-medium break-all select-all">{address}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void copyAddress(address)}
          >
            <Copy className="size-3.5" aria-hidden />
            {OWNER_EMAIL_SENDER_COPY.copy}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {OWNER_EMAIL_SENDER_COPY.notSet}
        </p>
      )}
    </div>
  );
}

/**
 * Settings → Owner email sender: the read-only address each Self-Manage agency's owner emails
 * are sent from (`"Agency name" <slug@email.crossub.com.au>`). CROSSUB staff change it in admin.
 */
export function OwnerEmailSenderCard() {
  const { agencies: allAgencies } = useAgentData();
  const agencies = selfManagedAgencies(allAgencies);
  if (agencies.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold">{OWNER_EMAIL_SENDER_COPY.title}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {OWNER_EMAIL_SENDER_COPY.description}
        </p>
      </div>
      {agencies.map((agency) => (
        <AgencySenderRow key={agency.id} agency={agency} showAgencyName={agencies.length > 1} />
      ))}
      <p className="text-muted-foreground px-1 text-[12px]">{OWNER_EMAIL_SENDER_COPY.changeNote}</p>
    </section>
  );
}
