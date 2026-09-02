'use client';

import { Clock } from 'lucide-react';

export function TribunalAwaitingAccountManagerPanel({
  kind = 'tribunal',
}: {
  kind?: 'rent_chasing' | 'tribunal';
}) {
  const label = kind === 'rent_chasing' ? 'Rent chasing' : 'Tribunal';

  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-8 text-center">
      <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
        <Clock className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{label} case lodged</h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
        The Account Manager has been notified. Wait for their response before taking further
        action on this case.
      </p>
    </div>
  );
}
