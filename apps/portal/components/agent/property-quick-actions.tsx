'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Gavel, MessageSquare, Plus, TrendingUp, Wrench, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { messagesNew, ROUTES, inspectionNew } from '@/constants/routes';

const ACTIONS = [
  { id: 'maintenance', label: 'Maintenance request', icon: Wrench, href: (id: string) => `${ROUTES.MAINTENANCE}?property=${id}` },
  { id: 'inspection', label: 'Open inspection', icon: ClipboardList, href: (id: string) => inspectionNew(id) },
  { id: 'rent-review', label: 'Rent review', icon: TrendingUp, href: () => ROUTES.RENT_REVIEW },
  { id: 'tribunal', label: 'Tribunal case', icon: Gavel, href: () => ROUTES.TRIBUNAL },
  { id: 'message', label: 'Message', icon: MessageSquare, href: () => messagesNew() },
] as const;

export function PropertyQuickActions({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition active:scale-95"
        aria-label="Quick actions"
      >
        <Plus className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Quick create</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="text-muted-foreground size-5" />
              </button>
            </div>
            <div className="space-y-1">
              {ACTIONS.map(({ id, label, icon: Icon, href }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(href(propertyId));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary"
                >
                  <Icon className="text-primary size-4" />
                  {label}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
