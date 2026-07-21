'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function CrossubLogo({
  className,
  href = ROUTES.DASHBOARD,
  showTagline = false,
  size = 'md',
}: {
  className?: string;
  href?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 28, md: 36, lg: 56 } as const;
  const dimension = sizes[size];

  const content = (
    <div className={cn('flex flex-col items-start', className)}>
      <div className="overflow-hidden rounded-lg">
        <Image
          src="/crossub-logo.png"
          alt="CROSSUB"
          width={dimension}
          height={dimension}
          className="size-auto object-contain"
          style={{ width: dimension, height: dimension }}
          priority
        />
      </div>
      {showTagline ? (
        <p className="text-muted-foreground mt-1.5 text-[9px] font-medium tracking-[0.2em] uppercase">
          Your property partner
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
