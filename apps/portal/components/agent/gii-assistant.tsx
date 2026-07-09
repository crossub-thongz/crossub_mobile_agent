'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Phone, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageDetail } from '@/constants/routes';
import {
  buildGiiReply,
  searchAgentSystem,
  type SystemSearchResult,
} from '@/lib/agent-system-search';
import { cn } from '@/lib/utils';

type ChatLine = { id: string; role: 'user' | 'assistant'; text: string; results?: SystemSearchResult[] };

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
  variant?: 'modal' | 'panel';
}) {
  const router = useRouter();
  const data = useAgentData();
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isPanel = variant === 'panel';

  const latestResults = useMemo(() => {
    const last = [...lines].reverse().find((l) => l.role === 'assistant' && l.results?.length);
    return last?.results ?? [];
  }, [lines]);

  const runQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const found = searchAgentSystem(trimmed, data);
    setLines((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: buildGiiReply(trimmed, found),
        results: found,
      },
    ]);
    setQuery('');
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
      if (transcript) runQuery(transcript);
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
        isPanel
          ? 'h-full max-h-full w-full border-l'
          : 'h-[min(92vh,680px)] w-full max-w-lg rounded-t-3xl border shadow-2xl sm:rounded-3xl',
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-md">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Gii</p>
            <p className="text-muted-foreground truncate text-[10px]">
              {isPanel ? 'Property assistant' : `Your property assistant · ${multilingualHint()}`}
            </p>
          </div>
        </div>
        {!isPanel && onClose ? (
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-semibold">Ask Gii anything</p>
            <p className="text-muted-foreground mt-1.5 max-w-[240px] text-xs leading-relaxed">
              {multilingualHint()}
            </p>
          </div>
        ) : null}

        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              line.role === 'user'
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-secondary mr-auto text-foreground',
            )}
          >
            {line.text}
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
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <Link href={r.href} onClick={() => onClose?.()}>
                      Open
                    </Link>
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
      </div>

      <div className="shrink-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runQuery(query);
            }}
            placeholder="Ask Gii anything…"
            className="min-h-11 flex-1 rounded-full border-border/80 bg-secondary/40 px-4"
            autoFocus={isPanel}
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => runQuery(query)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95"
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
                'flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-95',
                'bg-gradient-to-br from-primary via-emerald-500 to-teal-600',
                listening && 'ring-4 ring-primary/35 scale-110',
              )}
              aria-label={listening ? 'Stop recording' : 'Hold to speak'}
            >
              {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isPanel) {
    return shell;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:p-4">
      {shell}
    </div>
  );
}
