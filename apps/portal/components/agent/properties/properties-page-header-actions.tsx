'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { AgentHowToUseLink } from '@/components/agent/agent-page-tour';
import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

export function PropertiesPageHeaderActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AgentHowToUseLink module="properties" className="rounded-xl" />
      <Button className="rounded-xl transition-opacity hover:opacity-90" asChild>
        <Link href={propertyNew()} data-tour="properties-add">
          <Plus className="size-4" />
          Add property
        </Link>
      </Button>
    </div>
  );
}
