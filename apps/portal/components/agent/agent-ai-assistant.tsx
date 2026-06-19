'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Mic, MicOff, Phone, Send, X } from 'lucide-react';
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

type ChatLine = { id: string; role: 'user' | 'assistant'; text: string };

export function AgentAiAssistant({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const data = useAgentData();
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi — I can search your whole portfolio: properties, maintenance, inspections, tribunal, messages, and more. Ask a question or use voice input.',
    },
  ]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const results = useMemo(
    () => searchAgentSystem(query, data),
    [query, data],
  );

  const runSearch = (text: string) => {
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
      },
    ]);
    setQuery(trimmed);
  };

  const startVoice = () => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser');
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
      toast.error('Could not capture voice — try again');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setQuery(transcript);
        runSearch(transcript);
      }
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
      toast.error('No phone number on file for this contact');
      return;
    }
    window.location.href = `tel:${result.phone}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:p-4">
      <div className="flex h-[min(88vh,640px)] w-full max-w-lg flex-col rounded-t-2xl border bg-background shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <Bot className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Agent AI</p>
              <p className="text-muted-foreground text-[10px]">Search · voice · message · call</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className={cn(
                'max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                line.role === 'user'
                  ? 'bg-primary/10 ml-auto text-foreground'
                  : 'bg-secondary mr-auto text-foreground',
              )}
            >
              {line.text}
            </div>
          ))}

          {query && results.length > 0 && (
            <ul className="space-y-2 pt-1">
              {results.map((r) => (
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

        <div className="space-y-2 border-t p-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(query);
              }}
              placeholder="Find property, job, inspection…"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={listening ? 'Stop voice input' : 'Voice input'}
              onClick={listening ? stopVoice : startVoice}
            >
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
          </div>
          <Button type="button" className="w-full" onClick={() => runSearch(query)}>
            Search system
          </Button>
        </div>
      </div>
    </div>
  );
}
