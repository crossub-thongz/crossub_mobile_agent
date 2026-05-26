'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { messageDetail, ROUTES } from '@/constants/routes';

export function CaseContactActions({
  propertyId,
  caseLabel,
}: {
  propertyId: string;
  caseLabel?: string;
}) {
  const { messages, properties } = useAgentData();
  const property = properties.find((p) => p.id === propertyId);
  const thread = messages.find((m) => m.propertyId === propertyId);

  if (!property) return null;

  const tenantVacant = property.tenantName.toLowerCase() === 'vacant';
  const href = thread ? messageDetail(thread.id) : ROUTES.MESSAGES;
  const contacts = tenantVacant
    ? property.homeOwnerName
    : `${property.homeOwnerName} · ${property.tenantName}`;

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {caseLabel ? `Messages · ${caseLabel}` : 'Messages'}
      </p>
      <Button variant="outline" size="sm" className="h-auto w-full flex-col gap-1 py-3" asChild>
        <Link href={href}>
          <MessageSquare className="size-4" />
          <span className="text-xs font-medium">Message owner & tenant</span>
          <span className="text-muted-foreground line-clamp-2 w-full text-center text-[10px] font-normal leading-tight">
            {contacts}
          </span>
        </Link>
      </Button>
    </div>
  );
}
