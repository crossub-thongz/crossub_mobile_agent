import Link from 'next/link';
import { ClipboardList, GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyLeasePackage, propertyLeasingWorkflow } from '@/constants/routes';

export function LeasingQuickActions({
  propertyId,
  leaseId,
}: {
  propertyId: string;
  leaseId?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
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
