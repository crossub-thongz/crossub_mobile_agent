'use client';

import Image from 'next/image';

import { CROS_ASSISTANT_NAME, CROS_LOGO_PATH } from '@/constants/cros-branding';
import { cn } from '@/lib/utils';

const SIZE = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 56,
  '2xl': 72,
} as const;

type CrosLogoSize = keyof typeof SIZE;

export function CrosAssistantLogo({
  size = 'md',
  className,
}: {
  size?: CrosLogoSize;
  className?: string;
}) {
  const px = SIZE[size];

  return (
    <Image
      src={CROS_LOGO_PATH}
      alt={CROS_ASSISTANT_NAME}
      width={px}
      height={px}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: px, height: px }}
    />
  );
}

/** CROS mascot with a soft shadow — no background box (PNG is transparent). */
export function CrosAssistantLogoBadge({
  size = 'lg',
  className,
}: {
  size?: CrosLogoSize;
  className?: string;
}) {
  return (
    <CrosAssistantLogo
      size={size}
      className={cn('drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)]', className)}
    />
  );
}
