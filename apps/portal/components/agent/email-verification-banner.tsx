'use client';

import { Loader2, Mail } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  needsEmailVerification,
  resendVerificationEmail,
} from '@/lib/email-verification';

const RESEND_COOLDOWN_MS = 60_000;

export function EmailVerificationBanner() {
  const { user, refresh } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const handleResend = useCallback(async () => {
    if (sending || Date.now() < cooldownUntil) return;

    setSending(true);
    try {
      await resendVerificationEmail();
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      toast.success('Verification email sent — check your inbox.');
      await refresh();
    } catch {
      toast.error('Unable to send verification email. Try again in a moment.');
    } finally {
      setSending(false);
    }
  }, [cooldownUntil, refresh, sending]);

  if (!needsEmailVerification(user)) return null;

  const onCooldown = Date.now() < cooldownUntil;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Mail className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Verify your email to unlock create actions
          </p>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            We sent a link to <span className="font-medium">{user?.email}</span>. Confirm your
            address to add properties, inspections, messages, and other workflows.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-600/40 bg-background/80 hover:bg-background"
          disabled={sending || onCooldown}
          onClick={() => void handleResend()}
        >
          {sending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Sending…
            </>
          ) : onCooldown ? (
            'Email sent'
          ) : (
            'Resend email'
          )}
        </Button>
      </div>
    </div>
  );
}
