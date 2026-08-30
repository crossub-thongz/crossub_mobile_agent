'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export function TaskJobLoading({ label = 'Loading task…' }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 px-4 py-16 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function TaskJobUnavailable({
  title = 'This task could not be found',
  description = 'It may still be saving. Go back to Tasks and open it again in a moment.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="px-4 py-10">
      <EmptyState
        title={title}
        description={description}
        action={
          <Button size="sm" asChild>
            <Link href={ROUTES.TASKS}>Back to Tasks</Link>
          </Button>
        }
      />
    </div>
  );
}
