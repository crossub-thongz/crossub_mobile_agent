'use client';

import { Plus } from 'lucide-react';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { unreadMessagesForProperty } from '@/lib/communications-log';
import { propertyIdFromPath } from '@/lib/property-path';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function isActiveChatPath(pathname: string): boolean {
  return /^\/messages\/[^/]+$/.test(pathname) && !pathname.startsWith('/messages/new');
}

/** Primary shell actions — Gii and + Message (actions live in the overflow menu). */
export function ShellPrimaryNav({
  pathname,
  variant = 'sidebar',
}: {
  pathname: string;
  variant?: 'sidebar' | 'tabbar';
}) {
  const { messages, properties, hasFullManagementAccess } = useAgentData();
  const activePanel = useShellDockStore((s) => s.activePanel);
  const openGii = useShellDockStore((s) => s.openGii);
  const togglePanel = useShellDockStore((s) => s.togglePanel);

  const propertyId = propertyIdFromPath(pathname);
  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const scopedUnread =
    propertyId && property
      ? unreadMessagesForProperty(
          propertyId,
          messages,
          formatPropertyFullAddress(property),
        )
      : 0;
  const globalUnread = messages.reduce((sum, m) => sum + (m.unread > 0 ? m.unread : 0), 0);
  const messageUnread = propertyId ? scopedUnread : globalUnread;

  const hideMessage = isActiveChatPath(pathname) || !hasFullManagementAccess;
  const giiActive = activePanel === 'gii';
  const messageActive = activePanel === 'message-menu';
  const fullAddress = property ? formatPropertyFullAddress(property) : undefined;

  const openGiiForShell = () => {
    if (propertyId && fullAddress) {
      openGii({ propertyId, propertyAddress: fullAddress });
      return;
    }
    openGii();
  };

  const baseClass =
    variant === 'tabbar'
      ? 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[9px] font-medium'
      : 'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition';

  const idleClass =
    variant === 'tabbar' ? 'text-muted-foreground' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground';
  const activeClass =
    variant === 'tabbar'
      ? 'text-primary'
      : 'bg-primary/10 text-primary shadow-sm shadow-primary/5';

  const ItemWrapper = variant === 'sidebar' ? 'li' : 'div';

  return (
    <>
      <ItemWrapper className={variant === 'tabbar' ? 'flex min-w-0 flex-1' : 'list-none'}>
        <button
          type="button"
          onClick={() => openGiiForShell()}
          className={cn(baseClass, giiActive ? activeClass : idleClass, variant === 'tabbar' && 'w-full')}
          aria-pressed={giiActive}
        >
          <CrosAssistantLogo
            size={variant === 'tabbar' ? 'md' : 'sm'}
          />
          <span className={variant === 'tabbar' ? undefined : 'flex-1 truncate text-left'}>
            {CROS_ASSISTANT_NAME}
          </span>
        </button>
      </ItemWrapper>
      {!hideMessage ? (
        <ItemWrapper className={variant === 'tabbar' ? 'flex min-w-0 flex-1' : 'list-none'}>
          <button
            type="button"
            onClick={() => togglePanel('message-menu')}
            className={cn(baseClass, messageActive ? activeClass : idleClass, variant === 'tabbar' && 'w-full')}
            aria-pressed={messageActive}
          >
            <span className="relative shrink-0">
              <Plus
                className={cn(
                  variant === 'tabbar' ? 'size-5' : 'size-4',
                  messageActive && variant === 'tabbar' && 'stroke-[2.5]',
                )}
              />
              {messageUnread > 0 ? (
                <MessageUnreadBadge
                  count={messageUnread}
                  size="sm"
                  className={cn(
                    'absolute ring-2 ring-background',
                    variant === 'tabbar' ? '-top-1.5 -right-2' : '-top-1 -right-2',
                  )}
                />
              ) : null}
            </span>
            <span className={variant === 'tabbar' ? undefined : 'flex-1 truncate text-left'}>
              + Message
            </span>
          </button>
        </ItemWrapper>
      ) : null}
    </>
  );
}
