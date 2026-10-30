'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  GII_PREFERENCES_COPY,
  GII_QUIET_DEFAULT,
  GII_SIGN_OFF_MAX_CHARS,
  GII_TONE_OPTIONS,
  type GiiTone,
} from '@/constants/gii-preferences';
import { ROUTES } from '@/constants/routes';
import {
  getGiiPreferences,
  updateGiiPreferences,
  type GiiPreferences,
} from '@/lib/crossub-api/gii-client';
import { cn } from '@/lib/utils';

type Draft = { tone: GiiTone; signOff: string; quietOn: boolean; quietStart: string; quietEnd: string };

function toDraft(prefs: GiiPreferences): Draft {
  return {
    tone: prefs.tone,
    signOff: prefs.signOff ?? '',
    quietOn: Boolean(prefs.quietStart && prefs.quietEnd),
    quietStart: prefs.quietStart ?? GII_QUIET_DEFAULT.START,
    quietEnd: prefs.quietEnd ?? GII_QUIET_DEFAULT.END,
  };
}

/**
 * Settings: the agent's Cros preferences (Jarvis 3.2), the same ones Cros changes when asked in
 * chat. Kept on the server, so they follow the agent to every device.
 */
export function GiiPreferencesSetting() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    getGiiPreferences()
      .then((prefs) => {
        if (live) setDraft(toDraft(prefs));
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)));
    return () => {
      live = false;
    };
  }, []);

  if (!draft) return null;

  const change = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const save = () => {
    setSaving(true);
    updateGiiPreferences({
      tone: draft.tone,
      signOff: draft.signOff.trim() || null,
      quietStart: draft.quietOn ? draft.quietStart : null,
      quietEnd: draft.quietOn ? draft.quietEnd : null,
    })
      .then((saved) => {
        setDraft(toDraft(saved));
        toast.success(GII_PREFERENCES_COPY.SAVED);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)))
      .finally(() => setSaving(false));
  };

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold">{GII_PREFERENCES_COPY.HEADING}</h2>
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">{GII_PREFERENCES_COPY.TONE_LABEL}</p>
            <p className="text-muted-foreground text-xs">{GII_PREFERENCES_COPY.TONE_DESCRIPTION}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GII_TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={draft.tone === option.value}
                onClick={() => change({ tone: option.value })}
                className={cn(
                  'rounded-lg border p-2 text-left',
                  draft.tone === option.value ? 'border-primary bg-primary/5' : 'text-muted-foreground',
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-[11px] leading-tight">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">{GII_PREFERENCES_COPY.SIGN_OFF_LABEL}</p>
            <p className="text-muted-foreground text-xs">{GII_PREFERENCES_COPY.SIGN_OFF_DESCRIPTION}</p>
          </div>
          <Textarea
            value={draft.signOff}
            maxLength={GII_SIGN_OFF_MAX_CHARS}
            rows={3}
            placeholder={GII_PREFERENCES_COPY.SIGN_OFF_PLACEHOLDER}
            aria-label={GII_PREFERENCES_COPY.SIGN_OFF_LABEL}
            onChange={(e) => change({ signOff: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{GII_PREFERENCES_COPY.QUIET_LABEL}</p>
              <p className="text-muted-foreground text-xs">{GII_PREFERENCES_COPY.QUIET_DESCRIPTION}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.quietOn}
              aria-label={GII_PREFERENCES_COPY.QUIET_LABEL}
              onClick={() => change({ quietOn: !draft.quietOn })}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                draft.quietOn ? 'bg-primary' : 'bg-secondary',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  draft.quietOn ? 'left-[22px]' : 'left-0.5',
                )}
              />
            </button>
          </div>
          {draft.quietOn ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">{GII_PREFERENCES_COPY.QUIET_FROM}</span>
                <Input type="time" value={draft.quietStart} onChange={(e) => change({ quietStart: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">{GII_PREFERENCES_COPY.QUIET_TO}</span>
                <Input type="time" value={draft.quietEnd} onChange={(e) => change({ quietEnd: e.target.value })} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div>
            <p className="text-sm font-medium">{GII_PREFERENCES_COPY.CONTRACTORS_LABEL}</p>
            <p className="text-muted-foreground text-xs">{GII_PREFERENCES_COPY.CONTRACTORS_DESCRIPTION}</p>
          </div>
          <Link href={ROUTES.PEOPLE} className="text-primary shrink-0 text-sm font-medium">
            {GII_PREFERENCES_COPY.CONTRACTORS_LINK}
          </Link>
        </div>

        <Button type="button" className="w-full" disabled={saving} onClick={save}>
          {saving ? GII_PREFERENCES_COPY.SAVING : GII_PREFERENCES_COPY.SAVE}
        </Button>
      </div>
    </section>
  );
}
