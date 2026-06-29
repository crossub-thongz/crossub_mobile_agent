import Link from 'next/link';
import { ClipboardList, GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyLeasePackage, propertyLeasingWorkflow } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function LeasingQuickActions({
  propertyId,
  leaseId,
  variant = 'default',
  className,
}: {
  propertyId: string;
  leaseId?: string;
  variant?: 'default' | 'compact';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex h-full flex-col gap-1.5', className)}>
        <Button
          asChild
          variant="outline"
          className="h-auto min-h-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] leading-tight font-medium"
        >
          <Link href={propertyLeasingWorkflow(propertyId)}>
            <GitBranch className="size-3.5 shrink-0" />
            <span className="text-center">Workflow</span>
          </Link>
        </Button>
        {leaseId ? (
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] leading-tight font-medium"
          >
            <Link href={propertyLeasePackage(propertyId, leaseId)}>
              <ClipboardList className="size-3.5 shrink-0" />
              <span className="text-center">Record</span>
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="h-auto min-h-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] leading-tight font-medium"
          >
            <ClipboardList className="size-3.5 shrink-0" />
            <span className="text-center">Record</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <Button asChild variant="outline" className="h-10 gap-1.5 text-xs">
        <Link href={propertyLeasingWorkflow(propertyId)}>
          <GitBranch className="size-3.5 shrink-0" />
          Leasing workflow
        </Link>
      </Button>
      {leaseId ? (
        <Button asChild variant="outline" className="h-10 gap-1.5 text-xs">
          <Link href={propertyLeasePackage(propertyId, leaseId)}>
            <ClipboardList className="size-3.5 shrink-0" />
            Lease record
          </Link>
        </Button>
      ) : (
        <Button variant="outline" className="h-10 gap-1.5 text-xs" disabled>
          <ClipboardList className="size-3.5 shrink-0" />
          Lease record
        </Button>
      )}
    </div>
  );
}
