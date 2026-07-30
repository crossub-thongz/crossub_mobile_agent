'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Mic, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { GiiAssessmentCard } from '@/components/agent/gii-assessment-card';
import { GiiBriefingCard } from '@/components/agent/gii-briefing-card';
import {
  GiiAttachButton,
  GiiAttachmentPreviewRow,
  GiiComposerDropOverlay,
} from '@/components/agent/gii-composer-attachments';
import { GiiPropertyJobsCard } from '@/components/agent/gii-property-jobs-card';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  VOICE_BUTTON_ARIA_LABEL,
  VOICE_PHASE,
  VOICE_STATUS_LABEL,
  VOICE_STOP_BUFFER_MS,
  VOICE_WAVE_BARS,
  type VoicePhase,
} from '@/constants/voice-input';
import {
  PORTFOLIO_GII_PROMPTS,
  PROPERTY_GII_PROMPTS,
} from '@/constants/gii-prompts';
import { buildGiiBriefing, type GiiBriefing } from '@/lib/gii-briefing';
import { selectPropertyInProgressJobs } from '@/lib/gii-property-jobs';
import { buildNeedActionGroups } from '@/lib/need-action-groups';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { useAgentStore } from '@/lib/store';
import type { PropertyNeedAction } from '@/lib/types';
import { needActionToJobRow } from '@/lib/portfolio-case-dialog';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  sendGiiMessage,
  type GiiAssessment,
  type GiiChatMessage,
  type GiiContext,
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
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function propertyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/properties\/([^/]+)$/);
  const id = match?.[1];
  if (!id || id === 'new') return undefined;
  return id;
}

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

function resolveSpeechLanguage(): string {
  if (typeof navigator === 'undefined') return 'en-AU';
  const lang = navigator.language || 'en-AU';
  if (lang.startsWith('zh')) return lang.includes('TW') ? 'zh-TW' : 'zh-CN';
  if (lang.startsWith('ms')) return 'ms-MY';
  if (lang.startsWith('vi')) return 'vi-VN';
  if (lang.startsWith('ja')) return 'ja-JP';
  if (lang.startsWith('ko')) return 'ko-KR';
  if (lang.startsWith('en')) return 'en-AU';
  return lang;
}

/**
 * Replaces the mic glyph while the recogniser is open, so the listening state is visible at
 * a glance. `settling` runs the bars down over the release buffer instead of cutting them.
 */
function VoiceWave({ settling }: { settling: boolean }) {
  return (
    <span className="flex h-6 items-center justify-center gap-[3px]" aria-hidden="true">
      {VOICE_WAVE_BARS.map((bar) => (
        <span
          key={bar.delayMs}
          className={cn(
            'block w-[3px] rounded-full bg-white',
            settling ? 'animate-voice-wave-settle' : 'animate-voice-wave',
          )}
          style={{ height: `${bar.heightPx}px`, animationDelay: `${bar.delayMs}ms` }}
        />
      ))}
    </span>
  );
}

function multilingualHint(): string {
  const lang = resolveSpeechLanguage();
  if (lang.startsWith('zh')) return 'Gii 支持中文语音和文字输入。';
  if (lang.startsWith('ms')) return 'Gii menyokong input suara dan teks dalam Bahasa Melayu.';
  return 'Type a question, or hold the mic to speak.';
}

export function GiiAssistant({
  open,
  onClose,
  variant = 'modal',
}: {
  open: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'panel' | 'embedded';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const data = useAgentData();
  const { user } = useAuth();
  const giiLaunch = useShellDockStore((s) => s.giiLaunch);
  const clearGiiLaunch = useShellDockStore((s) => s.clearGiiLaunch);
  const { selectedJob, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const [query, setQuery] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<GiiPendingAttachment[]>([]);
  const [composerDragActive, setComposerDragActive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(VOICE_PHASE.IDLE);
  const [sending, setSending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  /** Pending `stop()` scheduled on release — its presence *is* the "wrapping up" flag. */
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const initialPromptHandledRef = useRef(false);
  // The subject carried between turns. A ref: it must never be stale inside runQuery, and
  // it does not need to trigger a render.
  const contextRef = useRef<GiiContext | null>(null);
  const pendingAttachmentsRef = useRef<GiiPendingAttachment[]>([]);
  pendingAttachmentsRef.current = pendingAttachments;
  const listening = voicePhase === VOICE_PHASE.LISTENING;
  const wrappingUp = voicePhase === VOICE_PHASE.WRAPPING;
  /** The mic stays "hot" through the release buffer — the recogniser is still open. */
  const voiceActive = voicePhase !== VOICE_PHASE.IDLE;
  const isPanel = variant === 'panel';
  const isEmbedded = variant === 'embedded';
  const isModal = variant === 'modal';
  const isInline = isPanel || isEmbedded;
  /** Property embed scrolls the page; modal/panel keep the composer pinned with inner scroll. */
  const usePageScroll = isEmbedded;

  const pathPropertyId = propertyIdFromPath(pathname);
  const scopedProperty = useMemo(() => {
    const id = giiLaunch?.propertyId ?? pathPropertyId;
    if (!id) return null;
    return (
      data.properties.find((p) => p.id === id) ??
      data.archivedProperties.find((p) => p.id === id) ??
      null
    );
  }, [data.archivedProperties, data.properties, giiLaunch?.propertyId, pathPropertyId]);

  const scopedAddress = useMemo(() => {
    if (giiLaunch?.propertyAddress?.trim()) return giiLaunch.propertyAddress.trim();
    if (!scopedProperty) return null;
    return formatPropertyFullAddress(scopedProperty);
  }, [giiLaunch?.propertyAddress, scopedProperty]);

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

  const greetingText = useMemo(() => {
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
  }, [propertyJobs.length, liveBriefing, scopedAddress, scopedProperty, user?.firstName]);

  // What the greeting count and the empty-states key off — jobs on a property, else the
  // portfolio need-action briefing.
  const briefingIsEmpty = scopedProperty ? propertyJobs.length === 0 : liveBriefing.isEmpty;

  const hasUserMessages = useMemo(() => lines.some((l) => l.role === 'user'), [lines]);

  const suggestedPrompts = scopedProperty ? PROPERTY_GII_PROMPTS : PORTFOLIO_GII_PROMPTS;

  useEffect(() => {
    if (scopedProperty?.id) {
      contextRef.current = { propertyId: scopedProperty.id };
      return;
    }
    if (!giiLaunch?.propertyId) {
      contextRef.current = null;
    }
  }, [giiLaunch?.propertyId, scopedProperty?.id]);

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

      const history: GiiChatMessage[] = historyBase.map((l) => ({
        role: l.role,
        content: l.text,
        ...(l.id === userLine.id && apiAttachments?.length
          ? { attachments: apiAttachments }
          : l.sentAttachments?.length
            ? { attachments: l.sentAttachments }
            : {}),
      }));

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
        };
      }
      setLines((prev) =>
        prev.map((l) =>
          l.id === pendingId
            ? {
                ...l,
                text: res.reply,
                assessment: res.assessment,
                lodgedRef: res.lodged?.caseRef ?? null,
                pending: false,
              }
            : l,
        ),
      );
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
  }, [lines, pendingAttachments, sending]);

  // Launch prompt from property hub / phone book — runs once when Gii opens.
  useEffect(() => {
    if (!open || data.loading || !giiLaunch?.initialPrompt || initialPromptHandledRef.current) {
      return;
    }
    initialPromptHandledRef.current = true;
    const prompt = giiLaunch.initialPrompt;
    clearGiiLaunch();
    void runQuery(prompt);
  }, [clearGiiLaunch, data.loading, giiLaunch?.initialPrompt, open, runQuery]);

  useEffect(() => {
    if (!open) {
      initialPromptHandledRef.current = false;
    }
  }, [open]);

  /** Ask Gii conversationally about a briefing row — it resolves the property and lists its cases. */
  const askAboutRow = (row: PropertyNeedAction) => {
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

  const clearStopTimer = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const endVoiceSession = () => {
    clearStopTimer();
    recognitionRef.current = null;
    setVoicePhase(VOICE_PHASE.IDLE);
  };

  const startVoice = () => {
    // Pressed again inside the release buffer — cancel the pending stop and keep the same
    // utterance going rather than throwing away what has been captured so far.
    if (stopTimerRef.current) {
      clearStopTimer();
      setVoicePhase(VOICE_PHASE.LISTENING);
      return;
    }
    // A session is already open; `start()` would throw InvalidStateError.
    if (recognitionRef.current) return;
    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognitionCtor) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = resolveSpeechLanguage();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoicePhase(VOICE_PHASE.LISTENING);
    recognition.onend = endVoiceSession;
    recognition.onerror = (event) => {
      const aborted = event.error === 'aborted';
      endVoiceSession();
      // `abort()` on unmount is our own doing — don't blame the speaker for it.
      if (!aborted) toast.error('Could not hear you clearly — try again or type your question');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) void runQuery(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  /**
   * Releasing the button does NOT close the recogniser straight away. Web Speech drops the
   * utterance the instant `stop()` lands, so an immediate stop eats the final word. We keep
   * it open for VOICE_STOP_BUFFER_MS while the waveform settles.
   */
  const stopVoice = () => {
    if (!recognitionRef.current || stopTimerRef.current) return;
    setVoicePhase(VOICE_PHASE.WRAPPING);
    stopTimerRef.current = setTimeout(() => {
      stopTimerRef.current = null;
      try {
        recognitionRef.current?.stop(); // `onend` flips the phase back to idle
      } catch {
        endVoiceSession();
      }
    }, VOICE_STOP_BUFFER_MS);
  };

  // Leaving the panel mid-utterance must not leave a live recogniser or a pending stop behind.
  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recognitionRef.current?.abort();
    },
    [],
  );

  if (!open) return null;

  const shell = (
    <div
      className={cn(
        'flex flex-col bg-background',
        isEmbedded
          ? 'w-full'
          : isPanel
            ? 'h-full max-h-full min-h-0 w-full overflow-hidden border-l'
            : cn(
                'flex w-full max-w-lg flex-col border shadow-2xl',
                'max-lg:h-dvh max-lg:max-h-dvh max-lg:min-h-0 max-lg:overflow-hidden max-lg:rounded-none',
                'lg:h-[min(92vh,680px)] lg:min-h-0 lg:overflow-hidden lg:rounded-3xl',
                'rounded-t-3xl sm:rounded-3xl',
              ),
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-3',
          isEmbedded && 'py-2.5',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-md">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Gii</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {isEmbedded || isPanel
                ? 'Your Account Manager'
                : scopedAddress
                  ? `Account Manager · ${scopedAddress}`
                  : `Your Account Manager · ${multilingualHint()}`}
            </p>
          </div>
        </div>
        {!isInline && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Close Gii"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

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
        {!data.loading && !giiLaunch?.initialPrompt ? (
          <div className="space-y-2">
            {!hasUserMessages ? (
              <div className="bg-secondary mr-auto max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                {greetingText}
              </div>
            ) : null}
            {scopedProperty ? (
              propertyJobs.length > 0 ? (
                <GiiPropertyJobsCard jobs={propertyJobs} onOpen={openJob} />
              ) : null
            ) : !liveBriefing.isEmpty ? (
              <GiiBriefingCard
                briefing={liveBriefing}
                onNavigate={onClose}
                onAsk={askAboutRow}
                onOpen={openNeedAction}
              />
            ) : null}
          </div>
        ) : null}

        {lines.length === 0 && data.loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-semibold">Ask Gii, your Account Manager</p>
            <p className="text-muted-foreground mt-1.5 max-w-[260px] text-xs leading-relaxed">
              {scopedProperty
                ? 'Jobs in progress appear above. Tap any to open, or ask me about this property.'
                : multilingualHint()}
            </p>
          </div>
        ) : null}

        {lines.length === 0 && !data.loading && briefingIsEmpty && !giiLaunch?.initialPrompt ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-muted-foreground max-w-[260px] text-xs leading-relaxed">
              {scopedProperty
                ? 'Ask Gii to create a job or check this property.'
                : multilingualHint()}
            </p>
          </div>
        ) : null}

        {lines.map((line) => (
          <div key={line.id} className="space-y-2">
            <div
              className={cn(
                'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                line.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-secondary mr-auto text-foreground',
                line.pending && 'text-muted-foreground animate-pulse',
              )}
            >
              {line.attachments?.length ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {line.attachments.map((att) =>
                    att.previewUrl ? (
                      <img
                        key={att.fileName}
                        src={att.previewUrl}
                        alt={att.fileName}
                        className="max-h-24 max-w-full rounded-lg border border-white/20 object-cover"
                      />
                    ) : (
                      <span
                        key={att.fileName}
                        className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium"
                      >
                        {att.fileName}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
              {line.text}
            </div>

            {line.assessment ? <GiiAssessmentCard assessment={line.assessment} /> : null}

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
          <div className="flex items-end gap-2 max-lg:flex-col max-lg:items-stretch">
            <GiiAttachButton
              onPick={addAttachmentFiles}
              disabled={sending || voiceActive || pendingAttachments.length >= GII_MAX_ATTACHMENTS}
              className="mb-0.5 max-lg:hidden"
            />
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
                  ? 'Ask Gii to create a job or check this property…'
                  : 'Ask Gii anything…'
              }
              rows={isEmbedded ? 3 : 4}
              className={cn(
                'flex-1 resize-none overflow-y-auto rounded-2xl border-border/80 bg-secondary/40 px-4 py-3 text-sm leading-relaxed shadow-none max-lg:w-full',
                isEmbedded ? 'min-h-16 max-h-[160px]' : 'min-h-24 max-h-[220px]',
              )}
              autoFocus={isPanel}
              disabled={sending || voiceActive}
            />
            {query.trim() || pendingAttachments.length > 0 ? (
              <button
                type="button"
                onClick={() => void runQuery(query)}
                disabled={sending}
                className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95 max-lg:mb-0 max-lg:h-11 max-lg:w-full max-lg:rounded-2xl disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="size-5" />
              </button>
            ) : (
              <>
                <GiiAttachButton
                  onPick={addAttachmentFiles}
                  disabled={sending || voiceActive || pendingAttachments.length >= GII_MAX_ATTACHMENTS}
                  className="mb-0.5 hidden max-lg:mb-0 max-lg:flex max-lg:h-11 max-lg:w-full max-lg:rounded-2xl"
                />
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startVoice();
                  }}
                  onPointerUp={stopVoice}
                  onPointerLeave={() => {
                    if (voiceActive) stopVoice();
                  }}
                  onPointerCancel={stopVoice}
                  className={cn(
                    'mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-md',
                    'transition-all duration-300 ease-out active:scale-95',
                    'max-lg:mb-0 max-lg:h-11 max-lg:w-full max-lg:rounded-2xl',
                    voiceActive
                      ? 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600'
                      : 'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
                    listening && 'animate-voice-pulse-ring scale-110 max-lg:scale-100',
                    wrappingUp && 'scale-105 max-lg:scale-100',
                  )}
                  aria-label={voiceActive ? VOICE_BUTTON_ARIA_LABEL.ACTIVE : VOICE_BUTTON_ARIA_LABEL.IDLE}
                >
                  {voiceActive ? <VoiceWave settling={wrappingUp} /> : <Mic className="size-5" />}
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          Enter to send · Shift+Enter for a new line · Attach PDFs or images
        </p>
      </div>
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
        className="fixed inset-0 z-[95] bg-black/55 p-0 backdrop-blur-sm max-lg:overflow-hidden lg:flex lg:items-end lg:justify-center lg:overflow-hidden sm:p-4"
      >
        {shell}
      </div>
      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </>
  );
}
