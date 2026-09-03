'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { usePortalBackNavigation } from '@/hooks/use-portal-back-navigation';
import { cn } from '@/lib/utils';

export function PortalBackLink({
  fallbackHref = ROUTES.TASKS,
  fallbackLabel = 'Tasks',
  className,
  children,
}: {
  fallbackHref?: string;
  fallbackLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const back = usePortalBackNavigation(fallbackHref, fallbackLabel);
  const href = back?.href ?? fallbackHref;

  return (
    <Link href={href} className={cn(className)}>
      {children ?? (
        <>
          <ChevronLeft className="size-3.5" />
          Back
        </>
      )}
    </Link>
  );
}
