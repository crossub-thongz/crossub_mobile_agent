import {
  PORTAL_SERVICE_LEVEL_LABEL,
  resolvePortalServiceLevel,
  type AgentPortalServiceLevel,
} from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

const LEVEL_STYLES: Record<AgentPortalServiceLevel, string> = {
  LEVEL_1_INSPECTION_ONLY:
    'border-dashed border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  LEVEL_2_FULL_MANAGEMENT:
    'border-primary/25 bg-primary/10 text-primary',
};

export function PortalServiceLevelBadge({
  level,
  size = 'sm',
  className,
}: {
  level?: AgentPortalServiceLevel;
  size?: 'sm' | 'xs';
  className?: string;
}) {
  const resolved = resolvePortalServiceLevel(level);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold tracking-wide',
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        LEVEL_STYLES[resolved],
        className,
      )}
    >
      {PORTAL_SERVICE_LEVEL_LABEL[resolved]}
    </span>
  );
}
