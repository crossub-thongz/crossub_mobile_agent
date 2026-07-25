'use client';

import { cn } from '@/lib/utils';

export function WorkflowEmailSignatureBlock({
  logoUrl = '/crossub-logo.png',
  className,
}: {
  logoUrl?: string;
  className?: string;
}) {
  return (
    <div className={cn('mt-7 border-t border-border pt-5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="CROSSUB" width={56} height={56} className="mb-2.5 h-14 w-14" />
      <p className="text-sm font-semibold text-foreground">CROSSUB</p>
      <p className="text-xs text-muted-foreground">Property Management Platform</p>
    </div>
  );
}
