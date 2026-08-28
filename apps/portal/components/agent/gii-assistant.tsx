'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Mic, Minus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { CrosAssistantLogo, CrosAssistantLogoBadge } from '@/components/brand/cros-assistant-logo';
import { GiiAssessmentCard } from '@/components/agent/gii-assessment-card';
import {
  DashboardAskCrosPanel,
  DashboardNeedsAttentionPanel,
} from '@/components/agent/dashboard/dashboard-cros-panel';
import { GiiBriefingCard } from '@/components/agent/gii-briefing-card';
import { GiiChatGreeting, GiiChatLine } from '@/components/agent/gii-chat-line';
import {
  GiiAttachButton,
  GiiAttachmentPreviewRow,
  GiiComposerDropOverlay,
} from '@/components/agent/gii-composer-attachments';
import { GiiJobCaseButtons } from '@/components/agent/gii-job-case-buttons';
import { GiiPropertyJobsCard } from '@/components/agent/gii-property-jobs-card';
import { MessageCompose } from '@/components/agent/message-compose';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { ROUTES } from '@/constants/routes';
import {
  VOICE_BUTTON_ARIA_LABEL,
  VOICE_PHASE,
  VOICE_STATUS_LABEL,
  VOICE_WAVE_BARS,
  VOICE_WAVE_LEVEL_GAIN,
  VOICE_WAVE_REST_SCALE,
  type VoicePhase,
} from '@/constants/voice-input';
import {
  PORTFOLIO_GII_PROMPTS,
  PROPERTY_GII_PROMPTS,
} from '@/constants/gii-prompts';
import { MESSAGE_GII_PROMPTS } from '@/constants/gii-message-prompts';
import { buildGiiBriefing, type GiiBriefing } from '@/lib/gii-briefing';
import {
  primeGiiVoiceStatus,
  resolveSpeechLanguage,
  startGiiVoiceCapture,
  type GiiVoiceCapture,
} from '@/lib/gii-voice-input';
import { buildGiiPropertyContext } from '@/lib/gii-property-context';
import { selectPropertyInProgressJobs } from '@/lib/gii-property-jobs';
import { buildNeedActionGroups } from '@/lib/need-action-groups';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { useAgentStore } from '@/lib/store';
import type { PropertyNeedAction } from '@/lib/types';
import {
  inspectionToJobRow,
  maintenanceToJobRow,
  needActionToJobRow,
  rentReviewToJobRow,
} from '@/lib/portfolio-case-dialog';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  sendGiiMessage,
  type GiiAssessment,
  type GiiChatMessage,
  type GiiContext,
  type GiiJobCaseLink,
} from '@/lib/crossub-api/gii-client';
import {
  createPendingAttachment,
  filterGiiAttachmentFiles,
  GII_MAX_ATTACHMENT_BYTES,
  GII_MAX_ATTACHMENTS,
  pendingToApiAttachments,
  pendingToView,
  revokePendingAttachment,
  revokePendingAttachments,
  type GiiApiAttachment,
  type GiiChatAttachmentView,
  type GiiPendingAttachment,
} from '@/lib/gii-attachments';
import { propertyIdFromPath } from '@/lib/property-path';
import { useShellDockStore, type GiiScope } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function buildAccountManagerGreeting(
  address: string,
  jobCount: number,
  agentName?: string | null,
): string {
  const name = agentName?.trim();
  const lead = name ? `Hi ${name}` : 'Hi';
  if (jobCount > 0) {
    return `${lead} — I'm your Account Manager for ${address}. ${jobCount} job${jobCount === 1 ? '' : 's'} in progress here — tap any to open, or ask me about this property.`;
  }
  return `${lead} — I'm your Account Manager for ${address}. No jobs in progress right now. Ask me to add a repair, schedule an inspection, start leasing, or check status.`;
}

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  assessment?: GiiAssessment | null;
  briefing?: GiiBriefing | null;
  lodgedRef?: string | null;
  jobCases?: GiiJobCaseLink[];
  pending?: boolean;
  attachments?: GiiChatAttachmentView[];
  /** Base64 payloads resent with history so Gii can keep reading prior attachments. */
  sentAttachments?: GiiApiAttachment[];
};

/** Only the transcript goes to the server — local search results are a client concern. */
const MAX_HISTORY = 20;

/** Composer grows with typed content so longer questions stay visible. */
const COMPOSER_MIN_PX = 96;
const COMPOSER_MAX_PX = 220;

/** Monotonic line ids — `Date.now()` collides when two lines are pushed in one tick. */
let lineSeq = 0;
const idSeq = () => (lineSeq += 1);

/**
 * Replaces the mic glyph while the recogniser is open. The bars ride the real mic level
 * rather than animating on their own: a decorative waveform looks identical whether the
 * browser is capturing a voice or capturing nothing, which is precisely the question someone
 * has when the mic "isn't working". `settling` runs them down instead of cutting them.
 */
function VoiceWave({
  settling,
  level = null,
}: {
  settling: boolean;
  /** Measured 0–1 mic level, or null when this path has no meter (browser recogniser). */
  level?: number | null;
}) {
  // A running CSS animation beats an inline style on the same property, so the keyframes and
  // a measured level cannot both drive `transform` — the animation would silently win and the
  // bars would wave at a fixed rhythm no matter what the mic heard. Whichever is driving,
  // the other stands down.
  const reactive = level !== null && !settling;

  return (
    <span className="flex h-6 items-center justify-center gap-[3px]" aria-hidden="true">
      {VOICE_WAVE_BARS.map((bar) => (
        <span
          key={bar.delayMs}
          className={cn(
            'block w-[3px] origin-center rounded-full bg-white',
            settling && 'animate-voice-wave-settle',
            reactive && 'transition-transform duration-150 ease-out',
            !settling && !reactive && 'animate-voice-wave',
          )}
          style={{
            height: `${bar.heightPx}px`,
            animationDelay: `${bar.delayMs}ms`,
            transform: reactive
              ? `scaleY(${Math.min(
                  1,
                  VOICE_WAVE_REST_SCALE + level * bar.weight * VOICE_WAVE_LEVEL_GAIN,
                )})`
              : undefined,
          }}
        />
      ))}
    </span>
  );
}

function multilingualHint(): string {
  const lang = resolveSpeechLanguage();
  if (lang.startsWith('zh')) return `${CROS_ASSISTANT_NAME} 支持中文语音和文字输入。`;
  if (lang.startsWith('ms')) return `${CROS_ASSISTANT_NAME} menyokong input suara dan teks dalam Bahasa Melayu.`;
  return 'Type a question, or tap the mic to speak.';
}

/** API cap — keep invisible context payloads under this (see GiiChatMessageDto @MaxLength). */
const GII_CHAT_MESSAGE_MAX_CHARS = 4000;

function truncateGiiChatContent(content: string): string {
  if (content.length <= GII_CHAT_MESSAGE_MAX_CHARS) return content;
  return `${content.slice(0, GII_CHAT_MESSAGE_MAX_CHARS - 40).trimEnd()}\n\n[…truncated]`;
}

/** True when the agent's message is predominantly CJK (Chinese, etc.). */
function agentWritesInChinese(text: string): boolean {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  return cjk > 0 && cjk >= latin;
}

function replyLanguageDirective(recentUserText: string): string {
  if (agentWritesInChinese(recentUserText)) {
    return (
      'Reply in Chinese. The message thread and records below may be in English — ' +
      'summarize and explain in Chinese; keep addresses, dates and dollar amounts as written.'
    );
  }
  return 'Reply in the same language as the agent\'s messages in this conversation.';
}

export function GiiAssistant({
  open,
  onClose,
  variant = 'modal',
  expanded = true,
  scope,
  children,
  messageReply,
  dockFixed = true,
  dockLayout,
  replyEnabled = true,
}: {
  open: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'panel' | 'embedded' | 'message-dock';
  /** Mobile bottom sheet — when false the session stays mounted but hidden. */
  expanded?: boolean;
  /** Embed overrides — property/message pages pass scope directly instead of via the shell store. */
  scope?: GiiScope;
  /** Message thread bubbles rendered above the Gii transcript (message-dock only). */
  children?: React.ReactNode;
  /** Reply compose wired into the sticky dock (message-dock only). */
  messageReply?: {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    homeOwnerName: string;
    tenantName: string;
    placeholder?: string;
  };
  /** Pin dock to viewport (mobile message page) vs panel footer (desktop message center). */
  dockFixed?: boolean;
  /** `panel` = dock spans full column width at the bottom of a split pane. */
  dockLayout?: 'viewport' | 'panel';
  /** When false, only the Gii composer is shown (read-only threads). */
  replyEnabled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isV2 = useIsAgentUiV2();
  const data = useAgentData();
  const { user } = useAuth();
  const giiLaunch = useShellDockStore((s) => s.giiLaunch);
  const clearGiiLaunch = useShellDockStore((s) => s.clearGiiLaunch);
  const minimizeGii = useShellDockStore((s) => s.minimizeGii);

  const effectiveLaunch = useMemo(
    () => ({
      propertyId: scope?.propertyId ?? giiLaunch?.propertyId,
      propertyAddress: scope?.propertyAddress ?? giiLaunch?.propertyAddress,
      messageContext: scope?.messageContext ?? giiLaunch?.messageContext,
      initialPrompt: scope?.initialPrompt ?? giiLaunch?.initialPrompt,
    }),
    [giiLaunch, scope],
  );
  const messageScoped = Boolean(effectiveLaunch.messageContext?.trim());
  const { selectedJob, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();
  const refreshPortfolio = data.refresh;
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const resolveJobCaseLink = useCallback(
    (link: GiiJobCaseLink): PropertyJobRow | null => {
      if (link.kind === 'maintenance') {
        const item =
          portfolioData.maintenanceAll.find((row) => row.id === link.id) ??
          (link.reference
            ? portfolioData.maintenanceAll.find((row) => row.trackingNumber === link.reference)
            : undefined);
        return item ? maintenanceToJobRow(item) : null;
      }
      if (link.kind === 'rent_review') {
        const item = portfolioData.rentReviews.find((row) => row.id === link.id);
        return item ? rentReviewToJobRow(item, portfolioData.rentReviewDecisions) : null;
      }
      const item = portfolioData.inspections.find((row) => row.id === link.id);
      return item ? inspectionToJobRow(item) : null;
    },
    [portfolioData],
  );

  const openJobCaseLink = useCallback(
    async (link: GiiJobCaseLink) => {
      const existing = resolveJobCaseLink(link);
      if (existing) {
        openJob(existing);
        return;
      }
      // Newly created jobs may not be in the portfolio snapshot yet.
      await refreshPortfolio();
      toast.message('Refreshing jobs… tap Open again in a moment.');
    },
    [openJob, refreshPortfolio, resolveJobCaseLink],
  );
  const [query, setQuery] = useState('');
  const [dockTab, setDockTab] = useState<'gii' | 'reply'>('gii');
  const [pendingAttachments, setPendingAttachments] = useState<GiiPendingAttachment[]>([]);
  const [composerDragActive, setComposerDragActive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(VOICE_PHASE.IDLE);
  /** Live mic level (0–1) driving the waveform, so a dead input is visible immediately. */
  const [voiceLevel, setVoiceLevel] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const voiceCaptureRef = useRef<GiiVoiceCapture | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const initialPromptHandledRef = useRef(false);
  // The subject carried between turns. A ref: it must never be stale inside runQuery, and
  // it does not need to trigger a render.
  const contextRef = useRef<GiiContext | null>(null);
  const messageContextRef = useRef<string | null>(null);
  const propertyContextRef = useRef<string | null>(null);
  messageContextRef.current = effectiveLaunch.messageContext?.trim() || null;
  const pendingAttachmentsRef = useRef<GiiPendingAttachment[]>([]);
  pendingAttachmentsRef.current = pendingAttachments;
  const listening = voicePhase === VOICE_PHASE.LISTENING;
  const wrappingUp = voicePhase === VOICE_PHASE.WRAPPING;
  /** The mic stays "hot" through the release buffer — the recogniser is still open. */
  const voiceActive = voicePhase !== VOICE_PHASE.IDLE;
  const isPanel = variant === 'panel';
  const isEmbedded = variant === 'embedded';
  const isMessageDock = variant === 'message-dock';
  const isPanelDock = dockLayout === 'panel' || (!dockFixed && dockLayout !== 'viewport');
  const isModal = variant === 'modal';
  const isInline = isPanel || isEmbedded;
  /** Property embed and message dock scroll the page; modal/panel keep the composer pinned with inner scroll. */
  const usePageScroll = isEmbedded || isMessageDock;

  const pathPropertyId = propertyIdFromPath(pathname);
  const scopedProperty = useMemo(() => {
    const id = effectiveLaunch.propertyId ?? pathPropertyId;
    if (!id) return null;
    return (
      data.properties.find((p) => p.id === id) ??
      data.archivedProperties.find((p) => p.id === id) ??
      null
    );
  }, [data.archivedProperties, data.properties, effectiveLaunch.propertyId, pathPropertyId]);

  const scopedAddress = useMemo(() => {
    if (effectiveLaunch.propertyAddress?.trim()) return effectiveLaunch.propertyAddress.trim();
    if (!scopedProperty) return null;
    return formatPropertyFullAddress(scopedProperty);
  }, [effectiveLaunch.propertyAddress, scopedProperty]);

  const isDashboardV2Panel =
    isPanel &&
    isV2 &&
    pathname === ROUTES.DASHBOARD &&
    !scopedProperty &&
    !messageScoped;

  // On a property, Gii opens with that property's IN-PROGRESS JOBS — the same "Jobs in
  // progress" set the Overview tab shows (one shared selector, so the two never disagree),
  // not the smaller need-action subset. Portfolio scope keeps the need-action briefing.
  const propertyJobs = useMemo(() => {
    if (!scopedProperty) return [] as PropertyJobRow[];
    return selectPropertyInProgressJobs({
      property: scopedProperty,
      maintenanceAll: data.maintenanceAll,
      inspections: data.inspections,
      rentReviews: data.rentReviews,
      rentReviewDecisions,
      leasingRecords: data.leasingRecords,
      leasingCycles: data.leasingCycles,
      tenantSelections: data.tenantSelections,
      vacating: data.vacating,
      tribunalCases: data.tribunalCases,
      accounting: data.accounting,
    });
  }, [
    scopedProperty,
    data.maintenanceAll,
    data.inspections,
    data.rentReviews,
    rentReviewDecisions,
    data.leasingRecords,
    data.leasingCycles,
    data.tenantSelections,
    data.vacating,
    data.tribunalCases,
    data.accounting,
  ]);


  const briefingItems = useMemo(() => {
    if (!scopedProperty) return data.needActionItems;
    return data.needActionItems.filter((item) => item.propertyId === scopedProperty.id);
  }, [data.needActionItems, scopedProperty]);

  const briefingGroups = useMemo(
    () => buildNeedActionGroups(briefingItems),
    [briefingItems],
  );

  const liveBriefing = useMemo(
    () => buildGiiBriefing(briefingItems, briefingGroups, new Date(), user?.firstName),
    [briefingItems, briefingGroups, user?.firstName],
  );

  const briefingTitle =
    isV2 && pathname === ROUTES.DASHBOARD ? 'Needs Your Attention' : "Today's Jobs For You";

  const greetingText = useMemo(() => {
    if (messageScoped && scopedAddress) {
      const name = user?.firstName?.trim();
      const lead = name ? `Hi ${name}` : 'Hi';
      return `${lead} — I have this message thread and the property details for ${scopedAddress}. Ask me about the message, draft a reply, or clarify next steps — you don't need to paste any context.`;
    }
    if (scopedProperty && scopedAddress) {
      return buildAccountManagerGreeting(
        scopedAddress,
        propertyJobs.length,
        user?.firstName,
      );
    }
    return liveBriefing.subtitle
      ? `${liveBriefing.greeting}\n\n${liveBriefing.subtitle}`
      : liveBriefing.greeting;
  }, [
    messageScoped,
    propertyJobs.length,
    liveBriefing,
    scopedAddress,
    scopedProperty,
    user?.firstName,
  ]);

  // What the greeting count and the empty-states key off — jobs on a property, else the
  // portfolio need-action briefing.
  const briefingIsEmpty = scopedProperty ? propertyJobs.length === 0 : liveBriefing.isEmpty;

  const hasUserMessages = useMemo(() => lines.some((l) => l.role === 'user'), [lines]);

  const suggestedPrompts = messageScoped
    ? MESSAGE_GII_PROMPTS
    : scopedProperty
      ? PROPERTY_GII_PROMPTS
      : PORTFOLIO_GII_PROMPTS;

  const propertyContext = useMemo(() => {
    if (messageScoped) return null;
    if (scopedProperty) {
      return buildGiiPropertyContext({
        property: scopedProperty,
        address: scopedAddress ?? undefined,
        needActions: briefingItems,
        inProgressJobs: propertyJobs,
      });
    }
    if (effectiveLaunch.propertyId && effectiveLaunch.propertyAddress?.trim()) {
      return [
        `Property id: ${effectiveLaunch.propertyId}`,
        `Property address: ${effectiveLaunch.propertyAddress.trim()}`,
        '',
        'The agent is viewing this listing. Answer about this property directly — do not ask them to repeat the address or identify the listing.',
      ].join('\n');
    }
    return null;
  }, [
    briefingItems,
    effectiveLaunch.propertyAddress,
    effectiveLaunch.propertyId,
    messageScoped,
    propertyJobs,
    scopedAddress,
    scopedProperty,
  ]);

  propertyContextRef.current = propertyContext;

  useEffect(() => {
    if (scopedProperty?.id) {
      contextRef.current = {
        propertyId: scopedProperty.id,
        propertyLabel: scopedAddress ?? formatPropertyFullAddress(scopedProperty),
      };
      return;
    }
    if (effectiveLaunch.propertyId) {
      contextRef.current = {
        propertyId: effectiveLaunch.propertyId,
        propertyLabel: effectiveLaunch.propertyAddress?.trim(),
      };
      return;
    }
    contextRef.current = null;
  }, [effectiveLaunch.propertyAddress, effectiveLaunch.propertyId, scopedAddress, scopedProperty]);

  useEffect(() => {
    if (!scopedProperty?.id) return;
    setLines([]);
    setPendingAttachments((prev) => {
      revokePendingAttachments(prev);
      return [];
    });
    initialPromptHandledRef.current = false;
  }, [scopedProperty?.id]);

  useEffect(
    () => () => {
      revokePendingAttachments(pendingAttachmentsRef.current);
    },
    [],
  );

  useEffect(() => {
    if (open) return;
    revokePendingAttachments(pendingAttachmentsRef.current);
    setPendingAttachments([]);
    setLines((prev) => {
      for (const line of prev) {
        for (const att of line.attachments ?? []) {
          if (att.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(att.previewUrl);
        }
      }
      return [];
    });
  }, [open]);

  const addAttachmentFiles = useCallback((files: File[]) => {
    const { added, rejected, overLimit } = filterGiiAttachmentFiles(
      files,
      pendingAttachments.length,
    );
    if (rejected.length || overLimit) {
      toast.error(
        `Attach up to ${GII_MAX_ATTACHMENTS} PDFs or images (max ${Math.round(GII_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB each).`,
      );
    }
    if (!added.length) return;
    const next = added
      .map(createPendingAttachment)
      .filter((att): att is GiiPendingAttachment => att != null);
    if (!next.length) return;
    setPendingAttachments((prev) => [...prev, ...next]);
  }, [pendingAttachments.length]);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((att) => att.id === id);
      if (target) revokePendingAttachment(target);
      return prev.filter((att) => att.id !== id);
    });
  }, []);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(COMPOSER_MAX_PX, Math.max(COMPOSER_MIN_PX, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [query, open]);

  const scrollChatToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      // Embedded + mobile modal share one scroll surface (avoids nested scroll on Android).
      if (usePageScroll) {
        endRef.current?.scrollIntoView({ behavior, block: 'nearest' });
        return;
      }
      const el = scrollContainerRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    [usePageScroll],
  );

  // Track whether the user has scrolled away from the latest messages.
  useEffect(() => {
    if (!open) return;

    if (isEmbedded) {
      const onScroll = () => {
        const end = endRef.current;
        if (!end) return;
        stickToBottomRef.current = end.getBoundingClientRect().bottom - window.innerHeight < 120;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isEmbedded, open]);

  // New turns follow the conversation; use instant scroll on embedded Android paths.
  useEffect(() => {
    if (lines.length === 0) return;
    stickToBottomRef.current = true;
    scrollChatToBottom(isEmbedded ? 'auto' : 'smooth');
  }, [isEmbedded, lines, scrollChatToBottom]);

  // Live briefing refreshes (5s poll) — page-scroll surfaces only; never yank scroll position.
  useEffect(() => {
    if (usePageScroll || !stickToBottomRef.current) return;
    scrollChatToBottom('smooth');
  }, [liveBriefing, scrollChatToBottom, usePageScroll]);

  /**
   * A turn is just the assistant on the API — it does the understanding and the maths.
   *
   * There used to be a second half: a local search sweep whose Open / Message / Call cards
   * rendered instantly so the panel did not feel dead while the old template-string brain
   * caught up. Both are gone. The cards matched on the raw query text, so an address
   * mentioned once pinned that property's every repair, inspection, rent review and
   * message under the answer — and they were rendered after the whole transcript rather
   * than under their own turn, so they stayed there, attached to whatever Gii said next.
   * A one-line "email sent" came with nine cards below it.
   */
  const runQuery = useCallback(async (text: string, attachmentFiles = pendingAttachments) => {
    const trimmed = text.trim();
    const hasAttachments = attachmentFiles.length > 0;
    if ((!trimmed && !hasAttachments) || sending) return;

    const attachmentViews = attachmentFiles.map(pendingToView);
    const userLine: ChatLine = {
      id: `u-${idSeq()}`,
      role: 'user',
      text: trimmed || '(attachment)',
      attachments: attachmentViews.length ? attachmentViews : undefined,
    };
    const pendingId = `a-${idSeq()}`;

    const historyBase = [...lines, userLine]
      .filter((l) => !l.pending)
      .slice(-MAX_HISTORY);

    setLines((prev) => [
      ...prev,
      userLine,
      { id: pendingId, role: 'assistant', text: 'Thinking…', pending: true },
    ]);
    setQuery('');
    setPendingAttachments((prev) =>
      prev.filter((att) => !attachmentFiles.some((sent) => sent.id === att.id)),
    );
    setSending(true);

    try {
      const apiAttachments = hasAttachments
        ? await pendingToApiAttachments(attachmentFiles)
        : undefined;

      const mapped: GiiChatMessage[] = historyBase.map((l) => ({
        role: l.role,
        content: l.text,
        ...(l.id === userLine.id && apiAttachments?.length
          ? { attachments: apiAttachments }
          : l.sentAttachments?.length
            ? { attachments: l.sentAttachments }
            : {}),
      }));

      const invisibleContext = messageContextRef.current ?? propertyContextRef.current;
      const contextSeed: GiiChatMessage | null = invisibleContext
        ? {
            role: 'user',
            content: truncateGiiChatContent(
              `[Context — ${
                messageContextRef.current
                  ? 'property, listing, and message thread'
                  : 'property and listing details'
              }. Use this information; do not ask the agent to repeat it. ${replyLanguageDirective(trimmed)}]\n\n${invisibleContext}`,
            ),
          }
        : null;

      const history: GiiChatMessage[] = [
        ...(contextSeed ? [contextSeed] : []),
        ...mapped,
      ].slice(-MAX_HISTORY);

      if (apiAttachments?.length) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === userLine.id ? { ...l, sentAttachments: apiAttachments } : l,
          ),
        );
      }

      const res = await sendGiiMessage({ messages: history, context: contextRef.current });
      if (res.assessment?.propertyId) {
        contextRef.current = {
          propertyId: res.assessment.propertyId,
          moveOutDate: res.assessment.moveOutDate,
          // Choice resolved — drop the ambiguous list.
        };
      } else if (res.pendingPropertyCandidates?.length) {
        contextRef.current = {
          ...contextRef.current,
          pendingPropertyCandidates: res.pendingPropertyCandidates,
        };
      } else if (contextRef.current?.pendingPropertyCandidates) {
        // Unique resolve without assessment still clears the pick list.
        const { pendingPropertyCandidates: _drop, ...rest } = contextRef.current;
        contextRef.current = rest;
      }
      const jobCases = res.jobCases ?? [];
      setLines((prev) =>
        prev.map((l) =>
          l.id === pendingId
            ? {
                ...l,
                text: res.reply,
                assessment: res.assessment,
                lodgedRef: res.lodged?.caseRef ?? null,
                jobCases,
                pending: false,
              }
            : l,
        ),
      );
      if (jobCases.length > 0) {
        void refreshPortfolio();
      }
    } catch {
      setLines((prev) =>
        prev.map((l) =>
          l.id === pendingId
            ? {
                ...l,
                text: "Sorry — I couldn't reach the assistant just then. Please try again.",
                pending: false,
              }
            : l,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [lines, pendingAttachments, refreshPortfolio, sending]);

  // Launch prompt from property hub / phone book — runs once when Gii opens.
  useEffect(() => {
    if (
      !open ||
      data.loading ||
      !effectiveLaunch.initialPrompt ||
      initialPromptHandledRef.current
    ) {
      return;
    }
    initialPromptHandledRef.current = true;
    const prompt = effectiveLaunch.initialPrompt;
    if (!scope?.initialPrompt) clearGiiLaunch();
    void runQuery(prompt);
  }, [
    clearGiiLaunch,
    data.loading,
    effectiveLaunch.initialPrompt,
    open,
    runQuery,
    scope?.initialPrompt,
  ]);

  useEffect(() => {
    if (!open) {
      initialPromptHandledRef.current = false;
    }
  }, [open]);

  /** Ask Gii conversationally about a briefing row — scoped to that property automatically. */
  const askAboutRow = (row: PropertyNeedAction) => {
    const rowProperty =
      data.properties.find((p) => p.id === row.propertyId) ??
      data.archivedProperties.find((p) => p.id === row.propertyId) ??
      null;

    contextRef.current = { propertyId: row.propertyId, propertyLabel: row.propertyAddress };
    propertyContextRef.current = rowProperty
      ? buildGiiPropertyContext({ property: rowProperty, address: row.propertyAddress })
      : [
          `Property id: ${row.propertyId}`,
          `Property address: ${row.propertyAddress}`,
          '',
          'The agent selected this listing. Answer about this property directly — do not ask them to repeat the address.',
        ].join('\n');

    void runQuery(`Give me an update on ${row.propertyAddress} — ${row.label}.`);
  };

  const openNeedAction = (row: PropertyNeedAction) => {
    const job = needActionToJobRow(row, portfolioData);
    if (job) {
      openJob(job);
      return;
    }
    router.push(row.href);
    onClose?.();
  };

  /**
   * Tap to start, tap again to send. The session also ends itself on a short run of silence,
   * so a mic left listening closes on its own.
   */
  const toggleVoice = () => {
    const active = voiceCaptureRef.current;
    if (active) {
      // Already settling — the second tap has nothing left to stop.
      active.stop();
      return;
    }

    const capture = startGiiVoiceCapture({
      onListening: () => setVoicePhase(VOICE_PHASE.LISTENING),
      onWrapping: () => {
        setVoicePhase(VOICE_PHASE.WRAPPING);
        setVoiceLevel(null);
      },
      onIdle: () => {
        voiceCaptureRef.current = null;
        setVoicePhase(VOICE_PHASE.IDLE);
        setVoiceLevel(null);
      },
      onLevel: setVoiceLevel,
      onTranscript: (text) => setQuery(text),
      onComplete: (text) => {
        voiceCaptureRef.current = null;
        setVoicePhase(VOICE_PHASE.IDLE);
        setVoiceLevel(null);
        void runQuery(text);
      },
      onError: (message) => {
        voiceCaptureRef.current = null;
        setVoicePhase(VOICE_PHASE.IDLE);
        setVoiceLevel(null);
        toast.error(message);
      },
    });
    if (capture) voiceCaptureRef.current = capture;
  };

  useEffect(
    () => () => {
      voiceCaptureRef.current?.abort();
    },
    [],
  );

  // Ask once, while the panel opens, which transcriber this environment has — by the time the
  // agent reaches the mic the answer is in, so the first press records the right way.
  useEffect(() => {
    if (open) primeGiiVoiceStatus();
  }, [open]);

  if (!open) return null;

  if (isModal && !expanded) {
    return (
      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    );
  }

  if (isMessageDock) {
    const scrollContent = (
      <>
        {children}
        {(lines.length > 0 || (!hasUserMessages && !data.loading)) && (
          <div className="mt-4 space-y-3">
            {!hasUserMessages && !data.loading ? (
              <GiiChatGreeting text={greetingText} />
            ) : null}
            {lines.map((line) => (
              <div key={line.id} className="space-y-2">
                <GiiChatLine role={line.role} text={line.text} pending={line.pending} />
                {line.assessment ? <GiiAssessmentCard assessment={line.assessment} /> : null}
                {line.jobCases?.length ? (
                  <GiiJobCaseButtons
                    cases={line.jobCases}
                    portfolioData={portfolioData}
                    onOpen={openJob}
                    onOpenMissing={openJobCaseLink}
                  />
                ) : null}
              </div>
            ))}
            <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
          </div>
        )}
      </>
    );

    const dockShell = (
      <>
          {replyEnabled ? (
            <div className="mb-2 flex gap-1 rounded-lg bg-secondary/60 p-0.5">
              <button
                type="button"
                onClick={() => setDockTab('gii')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition',
                  dockTab === 'gii'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <CrosAssistantLogo size="sm" />
                {CROS_ASSISTANT_NAME}
              </button>
              <button
                type="button"
                onClick={() => setDockTab('reply')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition',
                  dockTab === 'reply'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Send className="size-3.5" />
                Reply
              </button>
            </div>
          ) : null}

          {dockTab === 'gii' || !replyEnabled ? (
            <>
              {!sending && !hasUserMessages ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {suggestedPrompts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void runQuery(item.prompt)}
                      className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 text-[10px] font-medium transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div
                className="relative"
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!sending && !voiceActive) setComposerDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!sending && !voiceActive) setComposerDragActive(true);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setComposerDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setComposerDragActive(false);
                  if (sending || voiceActive) return;
                  addAttachmentFiles([...(e.dataTransfer.files ?? [])]);
                }}
              >
                <GiiComposerDropOverlay active={composerDragActive} />
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={composerRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void runQuery(query);
                      }
                    }}
                    placeholder={`Ask ${CROS_ASSISTANT_NAME} about this message…`}
                    rows={2}
                    className="min-h-14 max-h-28 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border-border/80 bg-secondary/40 px-3 py-2.5 text-sm leading-relaxed shadow-none"
                    disabled={sending || voiceActive}
                  />
                  <div className="mb-0.5 flex shrink-0 flex-col items-center gap-1.5">
                    <GiiAttachButton
                      onPick={addAttachmentFiles}
                      disabled={
                        sending || voiceActive || pendingAttachments.length >= GII_MAX_ATTACHMENTS
                      }
                      className="size-8"
                    />
                    {query.trim() || pendingAttachments.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void runQuery(query)}
                        disabled={sending}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95 disabled:opacity-50"
                        aria-label={`Ask ${CROS_ASSISTANT_NAME}`}
                      >
                        <Send className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={toggleVoice}
                        disabled={wrappingUp}
                        className={cn(
                          'flex size-10 shrink-0 touch-none items-center justify-center rounded-full text-white shadow-md transition active:scale-95',
                          // Red means "the mic is open" and nothing else. Holding it through
                          // transcription reads as still recording, so the wait looks like
                          // the app ignoring you rather than working.
                          listening && 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600',
                          wrappingUp && 'bg-gradient-to-br from-slate-400 to-slate-500',
                          !voiceActive &&
                            'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
                        )}
                        aria-label={
                          wrappingUp
                            ? VOICE_BUTTON_ARIA_LABEL.WRAPPING
                            : listening
                              ? VOICE_BUTTON_ARIA_LABEL.ACTIVE
                              : VOICE_BUTTON_ARIA_LABEL.IDLE
                        }
                        aria-pressed={listening}
                      >
                        {voiceActive ? <VoiceWave settling={wrappingUp} level={voiceLevel} /> : <Mic className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : messageReply ? (
            <div className="space-y-2">
              <MessageCompose
                value={messageReply.value}
                onChange={messageReply.onChange}
                onSubmit={messageReply.onSend}
                placeholder={messageReply.placeholder ?? 'Reply via app…'}
                homeOwnerName={messageReply.homeOwnerName}
                tenantName={messageReply.tenantName}
                rows={2}
              />
              <button
                type="button"
                className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                disabled={!messageReply.value.trim()}
                onClick={messageReply.onSend}
              >
                <Send className="size-4" />
                Send
              </button>
            </div>
          ) : null}
      </>
    );

    const dockClassName = cn(
      'border-border bg-background/95 z-10 w-full shrink-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/90',
      isPanelDock
        ? undefined
        : cn(
            'fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 max-w-lg -translate-x-1/2',
            'lg:sticky lg:bottom-0 lg:left-0 lg:max-w-none lg:translate-x-0 lg:shadow-none',
          ),
    );

    return (
      <>
        {isPanelDock ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {scrollContent}
            </div>
            <div className={dockClassName}>{dockShell}</div>
          </div>
        ) : (
          <>
            <div className="pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-4">
              {scrollContent}
            </div>
            <div className={dockClassName}>{dockShell}</div>
          </>
        )}
        <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
      </>
    );
  }

  const shell = (
    <div
      className={cn(
        'flex flex-col',
        isDashboardV2Panel ? 'bg-transparent' : 'bg-background',
        isEmbedded
          ? 'w-full'
          : isPanel
            ? 'h-full max-h-full min-h-0 w-full overflow-hidden border-l'
            : cn(
                'flex w-full max-w-lg flex-col border shadow-2xl',
                'max-lg:h-full max-lg:min-h-0 max-lg:overflow-hidden max-lg:rounded-t-3xl max-lg:border-b-0',
                'lg:h-[min(92vh,680px)] lg:min-h-0 lg:overflow-hidden lg:rounded-3xl',
                'rounded-t-3xl sm:rounded-3xl',
              ),
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-3',
          isEmbedded && 'py-2.5',
          isDashboardV2Panel && 'hidden',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CrosAssistantLogoBadge size="xl" />
          <div className="min-w-0">
            <p className="text-sm font-bold">{CROS_ASSISTANT_NAME}</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {messageScoped
                ? 'Message assistant · context loaded'
                : isEmbedded || isPanel
                  ? 'Your Account Manager'
                  : scopedAddress
                    ? `Account Manager · ${scopedAddress}`
                    : `Your Account Manager · ${multilingualHint()}`}
            </p>
          </div>
        </div>
        {!isInline && onClose ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {isModal ? (
              <button
                type="button"
                onClick={minimizeGii}
                className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
                aria-label={`Minimize ${CROS_ASSISTANT_NAME}`}
              >
                <Minus className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
              aria-label={`Close ${CROS_ASSISTANT_NAME}`}
            >
              <X className="size-5" />
            </button>
          </div>
        ) : null}
      </div>

      {isDashboardV2Panel ? (
        <div className="normal-case grid min-h-0 flex-1 grid-rows-[45fr_55fr] gap-3 p-3">
          <div className="v2-dashboard__card flex min-h-0 flex-col overflow-hidden">
            <DashboardNeedsAttentionPanel />
          </div>
          <div className="v2-dashboard__card flex min-h-0 flex-col overflow-hidden">
            <DashboardAskCrosPanel
              query={query}
              onQueryChange={setQuery}
              onSubmit={(event) => {
                event.preventDefault();
                void runQuery(query);
              }}
              onPrompt={(prompt) => void runQuery(prompt)}
              sending={sending}
              hasMessages={hasUserMessages}
              chatScrollRef={scrollContainerRef}
              chatEndRef={endRef}
              onMinimize={minimizeGii}
              onClose={onClose}
            >
              {lines.length > 0 ? (
                <div className="space-y-3 pb-2">
                  {lines.map((line) => (
                    <div key={line.id} className="space-y-2">
                      <GiiChatLine
                        role={line.role}
                        text={line.text}
                        pending={line.pending}
                        attachments={line.attachments}
                      />
                      {line.assessment ? <GiiAssessmentCard assessment={line.assessment} /> : null}
                      {line.jobCases?.length ? (
                        <GiiJobCaseButtons
                          cases={line.jobCases}
                          portfolioData={portfolioData}
                          onOpen={openJob}
                          onOpenMissing={openJobCaseLink}
                        />
                      ) : null}
                      {line.lodgedRef ? (
                        <p className="mr-auto text-xs font-medium text-primary">
                          Case <span className="tabular-nums">{line.lodgedRef}</span> created
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </DashboardAskCrosPanel>
          </div>
        </div>
      ) : (
        <>
      {scopedAddress && !isEmbedded ? (
        <div className="border-b px-4 py-2">
          <div className="bg-primary/5 flex items-center gap-2 rounded-xl border border-primary/15 px-3 py-2">
            <Building2 className="text-primary size-4 shrink-0" />
            <p className="min-w-0 truncate text-xs font-medium">{scopedAddress}</p>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollContainerRef}
        className={cn(
          'space-y-3 px-4 py-3',
          usePageScroll ? undefined : 'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        )}
      >
        {!data.loading && !effectiveLaunch.initialPrompt ? (
          <div className="space-y-2">
            {!hasUserMessages ? (
              <GiiChatGreeting text={greetingText} />
            ) : null}
            {!messageScoped && scopedProperty ? (
              propertyJobs.length > 0 ? (
                <GiiPropertyJobsCard jobs={propertyJobs} onOpen={openJob} />
              ) : null
            ) : !messageScoped && !liveBriefing.isEmpty ? (
              <GiiBriefingCard
                briefing={liveBriefing}
                title={briefingTitle}
                onNavigate={onClose}
                onAsk={askAboutRow}
                onOpen={openNeedAction}
              />
            ) : null}
          </div>
        ) : null}

        {lines.length === 0 && data.loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CrosAssistantLogoBadge size="2xl" className="mb-4" />
            <p className="text-sm font-semibold">Ask {CROS_ASSISTANT_NAME}, your Account Manager</p>
            <p className="text-muted-foreground mt-1.5 max-w-[260px] text-xs leading-relaxed">
              {scopedProperty
                ? 'Jobs in progress appear above. Tap any to open, or ask me about this property.'
                : multilingualHint()}
            </p>
          </div>
        ) : null}

        {lines.length === 0 &&
        !data.loading &&
        briefingIsEmpty &&
        !effectiveLaunch.initialPrompt &&
        !messageScoped ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-muted-foreground max-w-[260px] text-xs leading-relaxed">
              {scopedProperty
                ? `Ask ${CROS_ASSISTANT_NAME} to create a job or check this property.`
                : multilingualHint()}
            </p>
          </div>
        ) : null}

        {lines.map((line) => (
          <div key={line.id} className="space-y-2">
            <GiiChatLine
              role={line.role}
              text={line.text}
              pending={line.pending}
              attachments={line.attachments}
            />

            {line.assessment ? <GiiAssessmentCard assessment={line.assessment} /> : null}

            {line.jobCases?.length ? (
              <GiiJobCaseButtons
                cases={line.jobCases}
                portfolioData={portfolioData}
                onOpen={openJob}
                onOpenMissing={openJobCaseLink}
              />
            ) : null}

            {line.lodgedRef ? (
              <p className="mr-auto text-xs font-medium text-primary">
                Case <span className="tabular-nums">{line.lodgedRef}</span> created
              </p>
            ) : null}
          </div>
        ))}

        <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
      </div>

      <div className="bg-background sticky bottom-0 z-10 shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {!sending && !hasUserMessages ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestedPrompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void runQuery(item.prompt)}
                className="rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium transition hover:border-primary/30 hover:bg-primary/5"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {voiceActive ? (
          <div
            className={cn(
              'mb-2 flex items-center justify-center gap-2 text-xs font-medium transition-colors duration-300',
              wrappingUp ? 'text-muted-foreground' : 'text-red-500',
            )}
          >
            <span className="relative flex size-2">
              {listening ? (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
              ) : null}
              <span
                className={cn(
                  'relative inline-flex size-2 rounded-full transition-colors duration-300',
                  wrappingUp ? 'bg-muted-foreground' : 'bg-red-500',
                )}
              />
            </span>
            {listening ? VOICE_STATUS_LABEL.LISTENING : VOICE_STATUS_LABEL.WRAPPING}
          </div>
        ) : null}
        <div
          className="relative"
          onDragEnter={(e) => {
            e.preventDefault();
            if (!sending && !voiceActive) setComposerDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!sending && !voiceActive) setComposerDragActive(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setComposerDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setComposerDragActive(false);
            if (sending || voiceActive) return;
            addAttachmentFiles([...(e.dataTransfer.files ?? [])]);
          }}
        >
          <GiiComposerDropOverlay active={composerDragActive} />
          <GiiAttachmentPreviewRow
            attachments={pendingAttachments}
            onRemove={removePendingAttachment}
            disabled={sending || voiceActive}
          />
          <div className="flex items-end gap-2">
            <Textarea
              ref={composerRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void runQuery(query);
                }
              }}
              placeholder={
                scopedProperty
                  ? `Ask ${CROS_ASSISTANT_NAME} to create a job or check this property…`
                  : `Ask ${CROS_ASSISTANT_NAME} anything…`
              }
              rows={isEmbedded ? 3 : 4}
              className={cn(
                'min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border-border/80 bg-secondary/40 px-4 py-3 text-sm leading-relaxed shadow-none',
                isEmbedded ? 'min-h-16 max-h-[160px]' : 'min-h-24 max-h-[220px]',
              )}
              autoFocus={isPanel}
              disabled={sending || voiceActive}
            />
            <div className="mb-0.5 flex shrink-0 flex-col items-center gap-1.5">
              <GiiAttachButton
                onPick={addAttachmentFiles}
                disabled={sending || voiceActive || pendingAttachments.length >= GII_MAX_ATTACHMENTS}
                className="size-9"
              />
              {query.trim() || pendingAttachments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void runQuery(query)}
                  disabled={sending}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={wrappingUp}
                  className={cn(
                    'flex size-11 shrink-0 touch-none items-center justify-center rounded-full text-white shadow-md',
                    'transition-all duration-300 ease-out active:scale-95',
                    // Red is "the mic is open", never "please wait" — see the compact button.
                    listening &&
                      'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600 animate-voice-pulse-ring scale-110',
                    wrappingUp && 'bg-gradient-to-br from-slate-400 to-slate-500 scale-105',
                    !voiceActive && 'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
                  )}
                  aria-label={
                    wrappingUp
                      ? VOICE_BUTTON_ARIA_LABEL.WRAPPING
                      : listening
                        ? VOICE_BUTTON_ARIA_LABEL.ACTIVE
                        : VOICE_BUTTON_ARIA_LABEL.IDLE
                  }
                  aria-pressed={listening}
                >
                  {voiceActive ? <VoiceWave settling={wrappingUp} level={voiceLevel} /> : <Mic className="size-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          Enter to send · Shift+Enter for a new line · Attach PDFs or images
        </p>
      </div>
        </>
      )}
    </div>
  );

  if (isInline) {
    return (
      <>
        {shell}
        <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[95]',
          'max-lg:bg-black/40 max-lg:animate-in max-lg:fade-in-0 max-lg:duration-300',
          'lg:flex lg:items-end lg:justify-center lg:bg-black/55 lg:backdrop-blur-sm lg:overflow-hidden lg:p-4',
        )}
        onClick={isModal ? minimizeGii : undefined}
        role={isModal ? 'presentation' : undefined}
      >
        <div
          className={cn(
            'w-full max-w-lg',
            'max-lg:fixed max-lg:inset-x-0 max-lg:mx-auto',
            'max-lg:top-[calc(var(--env-banner-height,0px)+var(--shell-header-height,3.5rem)+0.75rem)]',
            'max-lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))]',
            isModal &&
              'max-lg:animate-in max-lg:fade-in-0 max-lg:slide-in-from-bottom-6 max-lg:duration-300 max-lg:ease-out',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {shell}
        </div>
      </div>
      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </>
  );
}
