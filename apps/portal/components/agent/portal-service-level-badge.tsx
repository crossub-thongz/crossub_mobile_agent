import {
  PORTAL_SERVICE_LEVEL_LABEL,
  PORTAL_SERVICE_LEVEL_TAG,
  resolvePortalServiceLevel,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

const LEVEL_STYLES: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY:
    'border-dashed border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  LEVEL_2_FULL_MANAGEMENT:
    'border-primary/25 bg-primary/10 text-primary',
  LEVEL_3_LEGACY:
    'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
};

export function PortalServiceLevelBadge({
  level,
  size = 'sm',
  variant = 'name',
  className,
}: {
  level?: AgentPortalServiceLevel;
  size?: 'sm' | 'xs' | 'md';
  /** `level` shows "Level 1" / "Level 2"; `both` adds the plan name after the tag. */
  variant?: 'name' | 'level' | 'both';
  className?: string;
}) {
  const resolved = resolvePortalServiceLevel(level);
  const label =
    variant === 'level'
      ? PORTAL_SERVICE_LEVEL_TAG[resolved]
      : variant === 'both'
        ? `${PORTAL_SERVICE_LEVEL_TAG[resolved]} · ${PORTAL_SERVICE_LEVEL_LABEL[resolved]}`
        : PORTAL_SERVICE_LEVEL_LABEL[resolved];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold tracking-wide',
        size === 'xs' && 'px-2 py-0.5 text-[10px]',
        size === 'sm' && 'px-2.5 py-0.5 text-[11px]',
        size === 'md' && 'px-3 py-1 text-xs',
        LEVEL_STYLES[resolved],
        className,
      )}
      title={PORTAL_SERVICE_LEVEL_LABEL[resolved]}
    >
      {label}
    </span>
  );
}
