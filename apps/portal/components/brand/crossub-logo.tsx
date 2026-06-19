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
  const heights = { sm: 24, md: 32, lg: 44 } as const;
  const h = heights[size];

  const content = (
    <div className={cn('flex flex-col', className)}>
      <div className="rounded-md bg-white px-1.5 py-0.5">
        <Image
        src="/crossub-logo.png"
        alt="CROSSUB"
        width={Math.round(h * 3.2)}
        height={h}
        className="h-auto w-auto object-contain"
        style={{ height: h, width: 'auto' }}
        priority
      />
      </div>
      {showTagline && (
        <p className="text-muted-foreground mt-1 text-[9px] font-medium tracking-[0.2em] uppercase">
          Your property partner
        </p>
      )}
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
