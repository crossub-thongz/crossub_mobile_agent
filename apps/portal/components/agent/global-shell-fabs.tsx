'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { PhonePanel } from '@/components/agent/phone-panel';
import { PropertyNewMessageRecipients } from '@/components/agent/property-new-message-recipients';
import { TalkToStaffSupportButton } from '@/components/agent/talk-to-staff-button';
import { QuickCreateWorkflowDialog } from '@/components/agent/quick-create-workflow-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messagesForProperty, messagesNew, ROUTES } from '@/constants/routes';
import {
  BUILTIN_QUICK_ACTIONS,
  resolveQuickActions,
} from '@/lib/quick-actions';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import { INSPECTION_ONLY_HIDDEN_QUICK_ACTIONS } from '@/lib/portal-service-level';
import { unreadMessagesForProperty } from '@/lib/communications-log';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { useAgentStore } from '@/lib/store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

const DOCK_BUTTONS = [
  {
    id: 'communication' as const,
    label: 'Messages',
    icon: MessageSquare,
    activeClass: 'border-primary/40 bg-primary/10 text-primary',
  },
  {
    id: 'phone' as const,
    label: 'Calls',
    icon: Phone,
    activeClass:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'quick' as const,
    label: 'Quick create',
    icon: Plus,
    activeClass:
      'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
] as const;

const MOBILE_GII_BUTTON = {
  id: 'gii' as const,
  label: 'Account Manager',
  icon: Sparkles,
  activeClass:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
} as const;

function propertyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/properties\/([^/]+)$/);
  const id = match?.[1];
  if (!id || id === 'new') return undefined;
  return id;
}

function isActiveChatPath(pathname: string): boolean {
  return /^\/messages\/[^/]+$/.test(pathname) && !pathname.startsWith('/messages/new');
}


function headerQuickActionClass(active: boolean, inline: boolean) {
  if (inline) {
    return cn(
      'relative flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
      active
        ? 'bg-primary-foreground/20 text-primary-foreground'
        : 'text-primary-foreground/90 hover:bg-primary-foreground/10',
    );
  }

  return cn(
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors',
    active
      ? 'bg-primary-foreground/20 text-primary-foreground'
      : 'text-primary-foreground/90 hover:bg-primary-foreground/10',
  );
}

function useShellQuickActions(pathname: string) {
  const hideCommunication = isActiveChatPath(pathname);
  const { hasFullManagementAccess } = useAgentData();
  const activePanel = useShellDockStore((s) => s.activePanel);
  const togglePanel = useShellDockStore((s) => s.togglePanel);

  const visibleButtons = DOCK_BUTTONS.filter((button) => {
    if (button.id === 'communication' && (hideCommunication || !hasFullManagementAccess)) {
      return false;
    }
    return true;
  });

  return { activePanel, togglePanel, visibleButtons };
}

/** Quick actions for the shell header — Messages, Calls, Quick create. */
export function ShellHeaderQuickActions({
  pathname,
  inline = true,
}: {
  pathname: string;
  /** Compact icon row for the header toolbar (default). */
  inline?: boolean;
}) {
  const propertyId = propertyIdFromPath(pathname);
  const { activePanel, togglePanel, visibleButtons } = useShellQuickActions(pathname);
  const { messages, properties } = useAgentData();

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

  if (visibleButtons.length === 0) return null;

  const handlePanelClick = (btnId: (typeof DOCK_BUTTONS)[number]['id']) => {
    if (btnId === 'communication' && propertyId) {
      togglePanel('communication');
      return;
    }
    togglePanel(btnId);
  };

  return (
    <div
      className={cn(
        'bg-primary flex shrink-0 items-center',
        inline ? 'gap-0.5 rounded-lg p-0.5' : 'gap-0.5 px-2 py-1',
      )}
    >
      {visibleButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = activePanel === btn.id;
        return (
          <button
            key={btn.id}
            type="button"
            title={btn.label}
            aria-label={btn.label}
            aria-pressed={isActive}
            onClick={() => handlePanelClick(btn.id)}
            className={headerQuickActionClass(isActive, inline)}
          >
            <Icon className={inline ? 'size-4' : 'size-5'} />
            {!inline ? <span className="max-w-full truncate">{btn.label}</span> : null}
            {btn.id === 'communication' ? (
              <UnreadBadge count={messageUnread} variant="header" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Mobile floating Gii launcher — centered rectangular pill above the bottom tab bar. */
export function MobileGiiFab({ pathname }: { pathname: string }) {
  const activePanel = useShellDockStore((s) => s.activePanel);
  const openGii = useShellDockStore((s) => s.openGii);
  const mobileGiiOpen = activePanel === 'gii';

  if (propertyIdFromPath(pathname) || mobileGiiOpen) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[60] flex w-full max-w-lg -translate-x-1/2 justify-center lg:hidden"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <button
        type="button"
        title={MOBILE_GII_BUTTON.label}
        aria-label={MOBILE_GII_BUTTON.label}
        onClick={() => openGii()}
        className={cn(
          'pointer-events-auto flex h-11 min-w-[8.75rem] items-center justify-center gap-2 rounded-xl px-5',
          'bg-gradient-to-br from-primary via-emerald-500 to-teal-600 text-white',
          'shadow-lg shadow-primary/30 ring-2 ring-background transition active:scale-[0.98]',
        )}
      >
        <MOBILE_GII_BUTTON.icon className="size-5 shrink-0" aria-hidden />
        <span className="text-sm font-semibold tracking-tight">Gii</span>
      </button>
    </div>
  );
}

export function GlobalShellFabs({ pathname }: { pathname: string }) {
  const propertyId = propertyIdFromPath(pathname);
  const activePanel = useShellDockStore((s) => s.activePanel);
  const closePanel = useShellDockStore((s) => s.closePanel);
  const mobileGiiOpen = activePanel === 'gii';

  return (
    <>
      <MobileGiiFab pathname={pathname} />
      <CommunicationDockSheet
        open={activePanel === 'communication'}
        onClose={closePanel}
        propertyId={propertyId}
      />
      <PhoneDockSheet
        open={activePanel === 'phone'}
        onClose={closePanel}
        propertyId={propertyId}
      />
      <QuickCreateDockSheet
        open={activePanel === 'quick'}
        onClose={closePanel}
        propertyId={propertyId}
      />
      {mobileGiiOpen && !propertyId ? (
        <div className="lg:hidden">
          <GiiAssistant open variant="modal" onClose={closePanel} />
        </div>
      ) : null}
    </>
  );
}

function UnreadBadge({
  count,
  variant = 'dock',
}: {
  count: number;
  variant?: 'dock' | 'header';
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'bg-destructive absolute flex items-center justify-center rounded-full font-bold text-white',
        variant === 'header'
          ? 'top-0 right-0 size-3.5 min-w-3.5 translate-x-1/4 -translate-y-1/4 text-[8px] leading-none'
          : '-top-0.5 -right-0.5 size-4 min-w-4 text-[9px]',
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function PhoneDockSheet({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}) {
  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex h-[min(72vh,560px)] w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <PhonePanel
            variant="sheet"
            onClose={onClose}
            propertyId={propertyId}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

function CommunicationDockSheet({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}) {
  const [view, setView] = useState<'menu' | 'new-message'>('menu');
  const { messages, properties } = useAgentData();

  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const propertyUnread =
    propertyId && property
      ? unreadMessagesForProperty(
          propertyId,
          messages,
          formatPropertyFullAddress(property),
        )
      : 0;

  useEffect(() => {
    if (!open) setView('menu');
  }, [open]);

  if (!open) return null;

  const sheetTitle = view === 'new-message' ? 'New message' : 'Messages';

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{sheetTitle}</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>
        {propertyId && property ? (
          view === 'new-message' ? (
            <PropertyNewMessageRecipients
              property={property}
              onBack={() => setView('menu')}
              onOpened={onClose}
            />
          ) : (
            <div className="space-y-2">
              <TalkToStaffSupportButton propertyId={propertyId} onOpened={onClose} />
              <Link
                href={messagesForProperty(propertyId)}
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
              >
                <Building2 className="text-primary size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-left">Property conversations</span>
                {propertyUnread > 0 ? (
                  <span className="bg-destructive shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                    {propertyUnread}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => setView('new-message')}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
              >
                <MessageSquare className="text-primary size-4 shrink-0" />
                New message
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <Link
              href={messagesNew()}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
            >
              <MessageSquare className="text-primary size-4" />
              New message
            </Link>
            <Link
              href={ROUTES.MESSAGES}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
            >
              <MessageSquare className="text-primary size-4" />
              All conversations
              {messages.some((m) => m.unread > 0) && (
                <span className="bg-destructive ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                  {messages.reduce((s, m) => s + m.unread, 0)}
                </span>
              )}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickCreateDockSheet({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}) {
  const [customize, setCustomize] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customHref, setCustomHref] = useState('');
  const [pendingWorkflow, setPendingWorkflow] = useState<{
    actionId: PropertyWorkflowActionId;
    propertyId?: string;
  } | null>(null);
  const router = useRouter();
  const { hasFullManagementAccess } = useAgentData();
  const hiddenBuiltinQuickActionIds = useAgentStore((s) => s.hiddenBuiltinQuickActionIds);
  const customQuickActions = useAgentStore((s) => s.customQuickActions);
  const toggleBuiltinQuickAction = useAgentStore((s) => s.toggleBuiltinQuickAction);
  const addCustomQuickAction = useAgentStore((s) => s.addCustomQuickAction);
  const removeCustomQuickAction = useAgentStore((s) => s.removeCustomQuickAction);
  const resetQuickActions = useAgentStore((s) => s.resetQuickActions);

  const actions = useMemo(() => {
    const hidden = new Set(hiddenBuiltinQuickActionIds);
    if (!hasFullManagementAccess) {
      for (const id of INSPECTION_ONLY_HIDDEN_QUICK_ACTIONS) hidden.add(id);
    }
    return resolveQuickActions([...hidden], customQuickActions, propertyId);
  }, [hiddenBuiltinQuickActionIds, customQuickActions, propertyId, hasFullManagementAccess]);

  const close = () => {
    setCustomize(false);
    setCustomLabel('');
    setCustomHref('');
    onClose();
  };

  const handleAddCustom = () => {
    if (!customLabel.trim() || !customHref.trim()) return;
    addCustomQuickAction(customLabel, customHref);
    setCustomLabel('');
    setCustomHref('');
  };

  if (!open) {
    return (
      <QuickCreateWorkflowDialog
        actionId={pendingWorkflow?.actionId ?? null}
        open={pendingWorkflow != null}
        onOpenChange={(next) => {
          if (!next) setPendingWorkflow(null);
        }}
        initialPropertyId={pendingWorkflow?.propertyId}
      />
    );
  }

  return (
    <>
      <QuickCreateWorkflowDialog
        actionId={pendingWorkflow?.actionId ?? null}
        open={pendingWorkflow != null}
        onOpenChange={(next) => {
          if (!next) setPendingWorkflow(null);
        }}
        initialPropertyId={pendingWorkflow?.propertyId}
      />
      <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">
            {customize ? 'Customize shortcuts' : 'Quick create'}
          </p>
          <button type="button" onClick={close} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>

        {!customize ? (
          <>
            {propertyId && (
              <p className="text-muted-foreground mb-2 text-xs">
                Property context — some actions will link to this listing.
              </p>
            )}
            <div className="max-h-[45vh] space-y-1 overflow-y-auto">
              {actions.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No shortcuts yet. Tap customize to add some.
                </p>
              ) : (
                actions.map(({ id, label, href, workflowActionId, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (workflowActionId) {
                        setPendingWorkflow({ actionId: workflowActionId, propertyId });
                        close();
                        return;
                      }
                      close();
                      router.push(href);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary"
                  >
                    <Icon className="text-primary size-4 shrink-0" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setCustomize(true)}
              className="text-muted-foreground mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium hover:bg-secondary"
            >
              <Settings2 className="size-3.5" />
              Customize shortcuts
            </button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-3 text-xs">
              Show or hide built-in actions, or add your own links.
            </p>
            <div className="max-h-[32vh] space-y-1 overflow-y-auto">
              {BUILTIN_QUICK_ACTIONS.map(({ id, label, icon: Icon }) => {
                const enabled = !hiddenBuiltinQuickActionIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleBuiltinQuickAction(id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm',
                      enabled ? 'border-primary/30 bg-primary/5' : 'opacity-60',
                    )}
                  >
                    <Icon className="text-primary size-4 shrink-0" />
                    <span className="flex-1 font-medium">{label}</span>
                    <span className="text-[10px] font-semibold uppercase">
                      {enabled ? 'On' : 'Off'}
                    </span>
                  </button>
                );
              })}
              {customQuickActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                >
                  <span className="flex-1 truncate text-sm font-medium">{action.label}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomQuickAction(action.id)}
                    className="text-destructive flex size-8 items-center justify-center rounded-lg hover:bg-destructive/10"
                    aria-label={`Remove ${action.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2 rounded-xl border bg-secondary/20 p-3">
              <p className="text-xs font-semibold">Add custom shortcut</p>
              <Input
                placeholder="Label (e.g. Open inspections)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
              <Input
                placeholder="Path (e.g. /inspections)"
                value={customHref}
                onChange={(e) => setCustomHref(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!customLabel.trim() || !customHref.trim()}
                onClick={handleAddCustom}
              >
                Add shortcut
              </Button>
            </div>

            <div className="mt-3 flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setCustomize(false)}>
                Back
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => resetQuickActions()}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
          </>
        )}

        <Button variant="ghost" className="mt-2 w-full" onClick={close}>
          Cancel
        </Button>
      </div>
    </div>
    </>
  );
}

/** @deprecated use CommunicationDockSheet via GlobalShellFabs */
export function ChatLauncherSheet({
  open,
  onClose,
  propertyId,
}: {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
}) {
  return (
    <CommunicationDockSheet open={open} onClose={onClose} propertyId={propertyId} />
  );
}
