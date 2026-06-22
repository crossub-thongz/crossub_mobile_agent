'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Keyboard, Mic, MicOff, Phone, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageDetail } from '@/constants/routes';
import {
  buildAgentAiReply,
  searchAgentSystem,
  type SystemSearchResult,
} from '@/lib/agent-system-search';
import { cn } from '@/lib/utils';

type ChatLine = { id: string; role: 'user' | 'assistant'; text: string; results?: SystemSearchResult[] };
type InputMode = 'voice' | 'text';

export function GiiAssistant({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const data = useAgentData();
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
        text: buildAgentAiReply(trimmed, found),
        results: found,
      },
    ]);
    setQuery('');
  };

  const startVoice = () => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported — switch to text');
      setInputMode('text');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-AU';
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
      onClose();
      return;
    }
    const threadId = data.ensureMessageThread(result.propertyId, {
      category: 'Others',
      subject: result.label,
    });
    if (threadId) {
      router.push(messageDetail(threadId));
      onClose();
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

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4">
      <div className="flex h-[min(92vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-md">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Gii</p>
              <p className="text-muted-foreground text-[10px]">Your property assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Close Gii"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
          {lines.length === 0 && inputMode === 'voice' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-6 max-w-[240px] text-sm">
                Tap the microphone and ask Gii anything about your portfolio.
              </p>
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                className={cn(
                  'relative flex size-28 items-center justify-center rounded-full transition-transform active:scale-95',
                  'bg-gradient-to-br from-primary via-emerald-500 to-teal-600 text-white shadow-xl shadow-primary/30',
                  listening && 'ring-4 ring-primary/40',
                )}
                aria-label={listening ? 'Stop listening' : 'Speak to Gii'}
              >
                {listening && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                )}
                {listening ? <MicOff className="relative size-10" /> : <Mic className="relative size-10" />}
              </button>
              <p className="text-muted-foreground mt-4 text-xs font-medium">
                {listening ? 'Listening…' : 'Tap to speak'}
              </p>
            </div>
          )}

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
                      <Link href={r.href} onClick={onClose}>
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

        <div className="space-y-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                inputMode === 'voice' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              <Mic className="size-3.5" />
              Voice
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                inputMode === 'text' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              <Keyboard className="size-3.5" />
              Type
            </button>
          </div>

          {inputMode === 'voice' ? (
            <Button
              type="button"
              className="w-full"
              variant={listening ? 'destructive' : 'default'}
              onClick={listening ? stopVoice : startVoice}
            >
              {listening ? (
                <>
                  <MicOff className="size-4" />
                  Stop listening
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  Speak to Gii
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runQuery(query);
                }}
                placeholder="Ask Gii anything…"
                className="flex-1"
                autoFocus
              />
              <Button type="button" onClick={() => runQuery(query)} disabled={!query.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
