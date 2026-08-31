'use client';

import { FileText, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { ApiError, api } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-types';
import {
  needsSystemAccessAgreement,
  postAuthDestination,
  type SystemAccessAgreementView,
} from '@/lib/system-access-agreement';

export default function SystemAccessAgreementPage() {
  const router = useRouter();
  const { user, status, refresh } = useAuth();
  const [agreement, setAgreement] = useState<SystemAccessAgreementView | null>(null);
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'guest') {
      router.replace(ROUTES.LOGIN);
      return;
    }
    if (status !== 'authed' || !user) return;

    if (!needsSystemAccessAgreement(user)) {
      router.replace(
        postAuthDestination(
          user,
          ROUTES.DASHBOARD,
          ROUTES.SYSTEM_ACCESS_AGREEMENT,
          ROUTES.CHANGE_PASSWORD,
        ),
      );
      return;
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (fullName) setSignerName(fullName);

    void (async () => {
      try {
        const data = await api.get<SystemAccessAgreementView>('/auth/system-access-agreement');
        setAgreement(data);
      } catch {
        toast.error('Unable to load the system access agreement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [status, user, router]);

  const onAccept = async () => {
    if (!signerName.trim()) {
      toast.error('Enter your full legal name.');
      return;
    }
    if (!agreed) {
      toast.error('You must confirm that you have read and agree to the agreement.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/system-access-agreement/accept', {
        signerName: signerName.trim(),
        agreed: true,
      });
      await api.post('/auth/refresh');
      await refresh();
      const me = await api.get<{ user: AuthUser }>('/auth/me');
      const next = postAuthDestination(
        me.user,
        ROUTES.DASHBOARD,
        ROUTES.SYSTEM_ACCESS_AGREEMENT,
        ROUTES.CHANGE_PASSWORD,
      );
      toast.success(
        next === ROUTES.CHANGE_PASSWORD
          ? 'Agreement accepted — please set a new password.'
          : 'Agreement accepted. Welcome to the CROSSUB Agent portal.',
      );
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || 'Unable to record your agreement.');
        return;
      }
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Required before access
            </p>
            <h1 className="text-xl font-semibold text-foreground">Agency Portal Access Agreement</h1>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Before using the CROSSUB Agent portal, you must read and accept the agency portal
          user access, confidentiality and privacy agreement. Your signed acceptance will be
          stored in the agency records.
        </p>

        {agreement ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{agreement.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Version {agreement.version} · {agreement.fileName}
                </p>
                <a
                  href="/api/auth/system-access-agreement/document"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Open agreement document
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signerName">Full legal name</Label>
            <Input
              id="signerName"
              inputKind="person_name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="As it appears on your agency registration"
              autoComplete="name"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="text-sm leading-relaxed text-foreground">
              I have read the agency portal access agreement and agree to be bound by its
              confidentiality and privacy terms.
            </span>
          </label>
        </div>

        <Button className="mt-6 w-full" disabled={submitting} onClick={() => void onAccept()}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Accept and continue'}
        </Button>
      </Card>
    </div>
  );
}
