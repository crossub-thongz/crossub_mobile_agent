'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function CrossubLogo({
  className,
  href = ROUTES.DASHBOARD,
  showTagline = false,
  showWordmark = false,
  wordmarkClassName,
  size = 'md',
}: {
  className?: string;
  href?: string;
  showTagline?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 28, md: 36, lg: 56 } as const;
  const dimension = sizes[size];

  const content = (
    <div
      className={cn(
        showWordmark ? 'flex min-w-0 flex-row items-center gap-2.5' : 'flex flex-col items-start',
        className,
      )}
    >
      <div className="shrink-0 overflow-hidden rounded-lg">
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
      {showWordmark ? (
        <span
          className={cn(
            'text-foreground truncate text-[15px] font-bold tracking-[0.14em] uppercase',
            wordmarkClassName,
          )}
        >
          CROSSUB
        </span>
      ) : null}
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
