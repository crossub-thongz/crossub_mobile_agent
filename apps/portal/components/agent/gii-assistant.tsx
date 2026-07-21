'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Mic, MicOff, Phone, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { GiiAssessmentCard } from '@/components/agent/gii-assessment-card';
import { GiiBriefingCard } from '@/components/agent/gii-briefing-card';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { messageDetail } from '@/constants/routes';
import {
  PORTFOLIO_GII_PROMPTS,
  PROPERTY_GII_PROMPTS,
} from '@/constants/gii-prompts';
import { searchAgentSystem, type SystemSearchResult } from '@/lib/agent-system-search';
import { buildGiiBriefing, type GiiBriefing } from '@/lib/gii-briefing';
import type { PropertyNeedAction } from '@/lib/types';
import {
  needActionToJobRow,
  searchResultToJobRow,
} from '@/lib/portfolio-case-dialog';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  sendGiiMessage,
  type GiiAssessment,
  type GiiContext,
} from '@/lib/crossub-api/gii-client';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function propertyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/properties\/([^/]+)$/);
  const id = match?.[1];
  if (!id || id === 'new') return undefined;
  return id;
}

function buildPropertyManagerGreeting(
  address: string,
  actionCount: number,
  agentName?: string | null,
): string {
  const name = agentName?.trim();
  const lead = name ? `Hi ${name}` : 'Hi';
  if (actionCount > 0) {
    return `${lead} — I'm your Property Manager for ${address}. ${actionCount} job${actionCount === 1 ? '' : 's'} need your attention — ask me for details or type Approve.`;
  }
  return `${lead} — I'm your Property Manager for ${address}. Ask me to add a repair, schedule inspections, start leasing, or check status.`;
}

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  results?: SystemSearchResult[];
  assessment?: GiiAssessment | null;
  briefing?: GiiBriefing | null;
  lodgedRef?: string | null;
  pending?: boolean;
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
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialPromptHandledRef = useRef(false);
  // The subject carried between turns. A ref: it must never be stale inside runQuery, and
  // it does not need to trigger a render.
  const contextRef = useRef<GiiContext | null>(null);
  const isPanel = variant === 'panel';
  const isEmbedded = variant === 'embedded';
  const isInline = isPanel || isEmbedded;

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

  const propertyActionCount = useMemo(() => {
    if (!scopedProperty) return 0;
    return data.getPropertyActions(scopedProperty.id).length;
  }, [data, scopedProperty]);

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
    initialPromptHandledRef.current = false;
  }, [scopedProperty?.id]);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(COMPOSER_MAX_PX, Math.max(COMPOSER_MIN_PX, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [query, open]);

  const latestResults = useMemo(() => {
    const last = [...lines].reverse().find((l) => l.role === 'assistant' && l.results?.length);
    return last?.results ?? [];
  }, [lines]);

  // Follow the conversation — a reply plus its card is taller than the viewport, so
  // without this the assessment lands below the fold.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines]);

  // Proactive briefing: when Gii opens onto an empty thread, greet and list what needs action
  // today. Every count and row comes from the provider's data — the model states nothing here.
  // Guarded on `lines.length === 0` so it never clobbers an in-progress conversation, and on
  // `!data.loading` so it waits for the first data load instead of flashing "all caught up".
  // Skipped when a launch prompt is queued — that turn replaces the greeting.
  useEffect(() => {
    if (
      !open ||
      data.loading ||
      lines.length > 0 ||
      giiLaunch?.initialPrompt ||
      initialPromptHandledRef.current
    ) {
      return;
    }

    if (scopedProperty && scopedAddress) {
      const propertyItems = data.needActionItems.filter(
        (item) => item.propertyId === scopedProperty.id,
      );
      const text = buildPropertyManagerGreeting(
        scopedAddress,
        propertyActionCount,
        user?.firstName,
      );
      const briefing =
        propertyItems.length > 0
          ? buildGiiBriefing(propertyItems, data.needActionGroups, new Date(), user?.firstName)
          : null;
      setLines([
        {
          id: `a-${idSeq()}`,
          role: 'assistant',
          text,
          briefing: briefing?.isEmpty ? null : briefing,
        },
      ]);
      return;
    }

    const briefing = buildGiiBriefing(
      data.needActionItems,
      data.needActionGroups,
      new Date(),
      user?.firstName,
    );
    const text = briefing.subtitle
      ? `${briefing.greeting}\n\n${briefing.subtitle}`
      : briefing.greeting;
    setLines([
      {
        id: `a-${idSeq()}`,
        role: 'assistant',
        text,
        briefing: briefing.isEmpty ? null : briefing,
      },
    ]);
  }, [
    open,
    data.loading,
    data.needActionItems,
    data.needActionGroups,
    giiLaunch?.initialPrompt,
    lines.length,
    propertyActionCount,
    scopedAddress,
    scopedProperty,
    user?.firstName,
  ]);

  /**
   * A turn runs two things at once:
   *  - `searchAgentSystem` over data the provider already holds — instant, offline, and
   *    what powers the Open / Message / Call result cards.
   *  - the real assistant on the API, which does the understanding and the maths.
   *
   * The local results render immediately so the panel never feels dead while the model
   * thinks; the reply replaces the placeholder when it lands. `buildGiiReply` (the old
   * template-string "brain") is retired — the reply is the model's now.
   */
  const runQuery = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const found = searchAgentSystem(trimmed, data);
    const userLine: ChatLine = { id: `u-${idSeq()}`, role: 'user', text: trimmed };
    const pendingId = `a-${idSeq()}`;

    // Snapshot the transcript BEFORE this turn's placeholder is added, or the placeholder
    // text ("Thinking…") is sent to the model as if it had said it.
    const history = [...lines, userLine]
      .filter((l) => !l.pending)
      .slice(-MAX_HISTORY)
      .map((l) => ({ role: l.role, content: l.text }));

    setLines((prev) => [
      ...prev,
      userLine,
      { id: pendingId, role: 'assistant', text: 'Thinking…', results: found, pending: true },
    ]);
    setQuery('');
    setSending(true);

    try {
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
  }, [data, lines, sending]);

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

  const openSearchResult = (result: SystemSearchResult) => {
    const job = searchResultToJobRow(result, portfolioData);
    if (job) {
      openJob(job);
      return;
    }
    router.push(result.href);
    onClose?.();
  };

  const startVoice = () => {
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
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error('Could not hear you clearly — try again or type your question');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) void runQuery(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const openMessage = (result: SystemSearchResult) => {
    if (!result.propertyId) {
      router.push(result.href);
      onClose?.();
      return;
    }
    const threadId = data.ensureMessageThread(result.propertyId, {
      category: 'Others',
      subject: result.label,
    });
    if (threadId) {
      router.push(messageDetail(threadId));
      onClose?.();
    }
  };

  const callContact = (result: SystemSearchResult) => {
    if (!result.phone) {
      toast.error('No phone number on file');
      return;
    }
    window.location.href = `tel:${result.phone}`;
  };

  if (!open) return null;

  const shell = (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden bg-background',
        isEmbedded
          ? 'h-full max-h-full w-full'
          : isPanel
            ? 'h-full max-h-full w-full border-l'
            : 'h-[min(92vh,680px)] w-full max-w-lg rounded-t-3xl border shadow-2xl sm:rounded-3xl',
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
                ? 'Your Property Manager'
                : scopedAddress
                  ? `Property Manager · ${scopedAddress}`
                  : `Your Property Manager · ${multilingualHint()}`}
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-semibold">Ask Gii, your Property Manager</p>
            <p className="text-muted-foreground mt-1.5 max-w-[260px] text-xs leading-relaxed">
              {scopedProperty
                ? 'Jobs needing your approval appear above. Ask for details, then reply Approve or ask follow-up questions.'
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
              {line.text}
            </div>

            {line.assessment ? <GiiAssessmentCard assessment={line.assessment} /> : null}

            {line.briefing ? (
              <GiiBriefingCard
                briefing={line.briefing}
                onNavigate={onClose}
                onAsk={askAboutRow}
                onOpen={openNeedAction}
              />
            ) : null}

            {line.lodgedRef ? (
              <p className="mr-auto text-xs font-medium text-primary">
                Case <span className="tabular-nums">{line.lodgedRef}</span> created
              </p>
            ) : null}
          </div>
        ))}

        {latestResults.length > 0 && (
          <ul className="space-y-2 pt-1 pb-2">
            {latestResults.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {r.kind}
                </p>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-muted-foreground text-xs">{r.sub}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openSearchResult(r)}
                  >
                    Open
                  </Button>
                  {r.propertyId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => openMessage(r)}
                    >
                      <Send className="size-3" />
                      Message
                    </Button>
                  )}
                  {r.phone && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => callContact(r)}
                    >
                      <Phone className="size-3" />
                      Call
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!sending && lines.length <= 1 ? (
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
        {listening ? (
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Listening… release when done
          </div>
        ) : null}
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
                ? 'Ask Gii to create a job or check this property…'
                : 'Ask Gii anything…'
            }
            rows={4}
            className="min-h-24 max-h-[220px] flex-1 resize-none overflow-y-auto rounded-2xl border-border/80 bg-secondary/40 px-4 py-3 text-sm leading-relaxed shadow-none"
            autoFocus={isInline}
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => void runQuery(query)}
              className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95"
              aria-label="Send message"
            >
              <Send className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                startVoice();
              }}
              onPointerUp={stopVoice}
              onPointerLeave={() => {
                if (listening) stopVoice();
              }}
              onPointerCancel={stopVoice}
              className={cn(
                'mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-95',
                'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
                listening && 'ring-4 ring-primary/35 scale-110',
              )}
              aria-label={listening ? 'Stop recording' : 'Hold to speak'}
            >
              {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
        </div>
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          Enter to send · Shift+Enter for a new line
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
      <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:p-4">
        {shell}
      </div>
      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </>
  );
}
