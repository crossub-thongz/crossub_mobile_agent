'use client';

import { Building2 } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { displayName } from '@/lib/utils';

export function AgentPortfolioBanner({
  propertyCount,
}: {
  propertyCount: number;
}) {
  const { user } = useAuth();

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="text-primary size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {user ? displayName(user) : 'Your portfolio'}
          </p>
          <p className="text-muted-foreground text-xs">
            {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'} · your
            landlords & tenants only
          </p>
        </div>
      </div>
    </div>
  );
}
