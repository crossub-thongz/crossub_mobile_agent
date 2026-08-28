'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PORTFOLIO_HEALTH_BUCKET_LABEL,
  type PortfolioHealthBucketKey,
  type PortfolioHealthPropertyEntry,
} from '@/lib/dashboard-home';
import { propertyDetail } from '@/constants/routes';

export function PortfolioHealthDetailDialog({
  bucket,
  entries,
  open,
  onOpenChange,
}: {
  bucket: PortfolioHealthBucketKey | null;
  entries: PortfolioHealthPropertyEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!bucket) return null;

  const title = PORTFOLIO_HEALTH_BUCKET_LABEL[bucket];
  const hasActions = bucket === 'needAction' || bucket === 'issues';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,560px)] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {entries.length === 0
              ? 'No properties in this bucket right now.'
              : hasActions
                ? `${entries.reduce((sum, entry) => sum + entry.actions.length, 0)} item${entries.reduce((sum, entry) => sum + entry.actions.length, 0) === 1 ? '' : 's'} across ${entries.length} propert${entries.length === 1 ? 'y' : 'ies'}`
                : `${entries.length} propert${entries.length === 1 ? 'y' : 'ies'}`}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(60vh,420px)] divide-y overflow-y-auto">
          {entries.length === 0 ? (
            <li className="text-muted-foreground px-5 py-8 text-center text-sm">Nothing to show.</li>
          ) : hasActions ? (
            entries.flatMap((entry) =>
              entry.actions.map((action) => (
                <li key={action.id}>
                  <Link
                    href={action.href}
                    onClick={() => onOpenChange(false)}
                    className="hover:bg-muted/40 flex items-start justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-muted-foreground truncate text-xs">{action.propertyAddress}</p>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  </Link>
                </li>
              )),
            )
          ) : (
            entries.map((entry) => (
              <li key={entry.propertyId}>
                <Link
                  href={propertyDetail(entry.propertyId)}
                  onClick={() => onOpenChange(false)}
                  className="hover:bg-muted/40 flex items-center justify-between gap-3 px-5 py-3"
                >
                  <p className="min-w-0 truncate text-sm">{entry.address}</p>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
