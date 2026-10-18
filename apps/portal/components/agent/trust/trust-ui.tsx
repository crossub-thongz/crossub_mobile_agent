'use client';

import { Download, Loader2, Mail, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TRUST_PAGE_COPY,
  TRUST_STATEMENT_EMAIL_COPY,
  TRUST_STATEMENT_EMAIL_STATUS,
  TRUST_STATEMENT_EMAIL_STATUS_LABEL,
  TRUST_STATEMENT_EMAIL_STATUS_TONE,
  type TrustStatementEmailStatus,
} from '@/constants/trust';
import {
  downloadTrustStatementPdf,
  emailTrustStatement,
  type AgentTrustStatementEmail,
} from '@/lib/crossub-api/agent-trust-client';
import { downloadInspectionReportFromApi } from '@/lib/inspection-report-pdf';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export const TRUST_TABLE_HEAD_CLASS =
  'text-muted-foreground px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide';
export const TRUST_TABLE_CELL_CLASS = 'px-3 py-2.5 align-top';

export function TrustPanel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function TrustStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold tabular-nums', tone)}>{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </div>
  );
}

export function TrustPill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TrustLoading() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
      <Loader2 className="size-4 animate-spin" />
      {TRUST_PAGE_COPY.loading}
    </div>
  );
}

export function TrustLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-4 text-sm">
      <p className="text-destructive">{apiErrorMessage(error, TRUST_PAGE_COPY.loadFailed)}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {TRUST_PAGE_COPY.retry}
      </Button>
    </div>
  );
}

export function TrustSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full lg:w-72 lg:shrink-0">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        className="h-9 rounded-lg pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TrustEmailStatusPill({ status }: { status: TrustStatementEmailStatus }) {
  return (
    <TrustPill className={TRUST_STATEMENT_EMAIL_STATUS_TONE[status]}>
      {TRUST_STATEMENT_EMAIL_STATUS_LABEL[status]}
    </TrustPill>
  );
}

/** Toast the outcome of emailing an owner statement. */
function toastStatementEmail(result: AgentTrustStatementEmail) {
  if (result.status === TRUST_STATEMENT_EMAIL_STATUS.SENT) {
    toast.success(TRUST_STATEMENT_EMAIL_COPY.sent(result.ownerEmail));
  } else if (result.status === TRUST_STATEMENT_EMAIL_STATUS.NO_OWNER_EMAIL) {
    toast.error(TRUST_STATEMENT_EMAIL_COPY.noOwnerEmail);
  } else {
    toast.error(TRUST_STATEMENT_EMAIL_COPY.failed);
  }
}

/** Emails (or re-emails) an owner statement and reports the outcome. */
export function TrustEmailOwnerButton({
  agencyId,
  statementId,
  label,
  onResult,
}: {
  agencyId: string;
  statementId: string;
  label: string;
  onResult?: (result: AgentTrustStatementEmail) => void;
}) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const result = await emailTrustStatement(agencyId, statementId);
      toastStatementEmail(result);
      onResult?.(result);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      disabled={pending}
      onClick={() => void onClick()}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
      {label}
    </Button>
  );
}

/** Downloads an owner statement PDF through the BFF as a named file. */
export function TrustStatementPdfButton({
  agencyId,
  statementId,
  filename,
  label,
}: {
  agencyId: string;
  statementId: string;
  filename: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await downloadInspectionReportFromApi(statementId, filename, (id) =>
        downloadTrustStatementPdf(agencyId, id),
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, TRUST_PAGE_COPY.pdfFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      disabled={pending}
      onClick={() => void onClick()}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {label}
    </Button>
  );
}
