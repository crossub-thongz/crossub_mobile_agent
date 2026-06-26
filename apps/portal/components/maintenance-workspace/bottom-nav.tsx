'use client';

import { Clock, MessageSquareText } from 'lucide-react';

import { cn } from '@/lib/utils';

export function WorkspaceBottomNav({
  bottomNavTab,
  setBottomNavTab,
}: {
  bottomNavTab: 'details' | 'chat';
  setBottomNavTab: (tab: 'details' | 'chat') => void;
}) {
  return (
    <div className="border-border bg-card/95 sticky bottom-0 z-20 border-t px-4 py-3 backdrop-blur">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setBottomNavTab('details')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
            bottomNavTab === 'details'
              ? 'border-primary/60 bg-primary/5 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
          )}
        >
          <Clock className="size-4" />
          Case
        </button>
        <button
          type="button"
          onClick={() => setBottomNavTab('chat')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
            bottomNavTab === 'chat'
              ? 'border-primary/60 bg-primary/5 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
          )}
        >
          <MessageSquareText className="size-4" />
          Chat
        </button>
      </div>
    </div>
  );
}
