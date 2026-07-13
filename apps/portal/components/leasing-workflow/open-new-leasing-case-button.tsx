'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyLeasingWorkflow } from '@/constants/routes';
import { LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';

export function OpenNewLeasingCaseButton({
  propertyId,
  className,
  size = 'sm',
  variant = 'outline',
}: {
  propertyId: string;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'secondary';
}) {
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const href = propertyLeasingWorkflow(propertyId);

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={className ?? 'h-8 gap-1.5 text-xs'}
    >
      <Link
        href={href}
        onClick={() => setActiveStep(propertyId, LEASING_LIFECYCLE_STEP.RESULTS)}
      >
        <ExternalLink className="size-3.5" />
        Open new leasing case
      </Link>
    </Button>
  );
}
