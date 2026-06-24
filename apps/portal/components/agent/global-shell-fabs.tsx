'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MessageSquare,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageDetail, messagesNew, ROUTES } from '@/constants/routes';
import {
  BUILTIN_QUICK_ACTIONS,
  resolveQuickActions,
} from '@/lib/quick-actions';
import { useAgentStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type DockPanel = 'communication' | 'quick' | 'gii' | null;

const DOCK_BUTTONS = [
  {
    id: 'communication' as const,
    label: 'Messages',
    icon: MessageSquare,
    activeClass: 'border-primary/40 bg-primary/10 text-primary',
  },
  {
    id: 'quick' as const,
    label: 'Quick create',
    icon: Plus,
    activeClass:
      'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    id: 'gii' as const,
    label: 'Gii',
    icon: Sparkles,
    activeClass:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
] as const;

function propertyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/properties\/([^/]+)$/);
  const id = match?.[1];
  if (!id || id === 'new') return undefined;
  return id;
}

function isActiveChatPath(pathname: string): boolean {
  return /^\/messages\/[^/]+$/.test(pathname) && !pathname.startsWith('/messages/new');
}

function dockButtonClass(active: boolean, activeClass: string) {
  return cn(
    'pointer-events-auto relative flex size-11 items-center justify-center rounded-full border bg-card/90 shadow-lg shadow-black/20 backdrop-blur-xl transition-all hover:-translate-y-0.5',
    active
      ? activeClass
      : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
  );
}

export function GlobalShellFabs({ pathname }: { pathname: string }) {
  const propertyId = propertyIdFromPath(pathname);
  const hideCommunication = isActiveChatPath(pathname);
  const [activePanel, setActivePanel] = useState<DockPanel>(null);

  const togglePanel = (id: DockPanel) => {
    setActivePanel((current) => (current === id ? null : id));
  };

  const closePanel = () => setActivePanel(null);

  const visibleButtons = hideCommunication
    ? DOCK_BUTTONS.filter((b) => b.id !== 'communication')
    : DOCK_BUTTONS;

  return (
    <>
      <CommunicationDockSheet
        open={activePanel === 'communication'}
        onClose={closePanel}
        propertyId={propertyId}
      />
      <QuickCreateDockSheet
        open={activePanel === 'quick'}
        onClose={closePanel}
        propertyId={propertyId}
      />
      <GiiAssistant open={activePanel === 'gii'} onClose={closePanel} />

      <div
        className={cn(
          'pointer-events-none fixed right-6 z-50 flex flex-col items-end gap-2',
          'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6',
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
              onClick={() => togglePanel(btn.id)}
              className={dockButtonClass(isActive, btn.activeClass)}
            >
              <Icon className="size-5" />
              {btn.id === 'communication' && <UnreadBadge />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function UnreadBadge() {
  const { messages } = useAgentData();
  const unread = messages.reduce((sum, m) => sum + m.unread, 0);
  if (unread <= 0) return null;
  return (
    <span className="bg-destructive absolute -top-0.5 -right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white">
      {unread > 9 ? '9+' : unread}
    </span>
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
  const router = useRouter();
  const { messages, ensureMessageThread } = useAgentData();

  const openPropertyChat = () => {
    if (!propertyId) return;
    const threadId = ensureMessageThread(propertyId);
    router.push(messageDetail(threadId));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Messages</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>
        <div className="space-y-2">
          {propertyId && (
            <button
              type="button"
              onClick={openPropertyChat}
              className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm hover:bg-secondary"
            >
              <Building2 className="text-primary size-4" />
              Property messages
            </button>
          )}
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
  const router = useRouter();
  const hiddenBuiltinQuickActionIds = useAgentStore((s) => s.hiddenBuiltinQuickActionIds);
  const customQuickActions = useAgentStore((s) => s.customQuickActions);
  const toggleBuiltinQuickAction = useAgentStore((s) => s.toggleBuiltinQuickAction);
  const addCustomQuickAction = useAgentStore((s) => s.addCustomQuickAction);
  const removeCustomQuickAction = useAgentStore((s) => s.removeCustomQuickAction);
  const resetQuickActions = useAgentStore((s) => s.resetQuickActions);

  const actions = useMemo(
    () => resolveQuickActions(hiddenBuiltinQuickActionIds, customQuickActions, propertyId),
    [hiddenBuiltinQuickActionIds, customQuickActions, propertyId],
  );

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

  if (!open) return null;

  return (
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
                actions.map(({ id, label, href, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
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
