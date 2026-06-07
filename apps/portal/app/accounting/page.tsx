'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Mail, MessageSquare, Phone, TrendingDown, TrendingUp } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function AccountingPage() {
  const { accounting } = useAgentData();
  const searchParams = useSearchParams();
  const arrearsOnly = searchParams.get('filter') === 'arrears';

  const list = useMemo(() => {
    if (arrearsOnly) return accounting.filter((a) => a.arrearsAmount > 0);
    return accounting;
  }, [accounting, arrearsOnly]);

  const totalIncome = accounting.reduce((s, a) => s + a.rentPaidYtd, 0);
  const totalArrears = accounting.reduce((s, a) => s + a.arrearsAmount, 0);

  return (
    <AgentShell title="Accounting" backHref={ROUTES.DASHBOARD}>
      <div className="space-y-4">
        <PageIntro
          description={
            arrearsOnly
              ? 'Properties with outstanding rent and collection history.'
              : 'Rental income and arrears across your portfolio.'
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary size-4" />
              <p className="text-muted-foreground text-[10px] font-medium uppercase">Income YTD</p>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/10 to-card p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-destructive size-4" />
              <p className="text-destructive text-[10px] font-medium uppercase">Arrears</p>
            </div>
            <p className="text-destructive mt-2 text-xl font-bold tabular-nums">
              {formatCurrency(totalArrears)}
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title={arrearsOnly ? 'No arrears' : 'No accounting records'}
            description={
              arrearsOnly
                ? 'All tenants are up to date on rent.'
                : 'Payment records will appear when connected to crossub_web.'
            }
          />
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <article
                key={a.propertyId}
                className="overflow-hidden rounded-2xl border bg-card"
              >
                <Link
                  href={`${propertyDetail(a.propertyId)}?tab=Accounting`}
                  className="flex items-start justify-between gap-2 border-b border-border/80 px-4 py-3.5 transition hover:bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-semibold">{a.propertyAddress}</p>
                    <p className="text-muted-foreground text-xs">{a.tenantName}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
                <dl className="grid grid-cols-2 gap-3 p-4 text-xs">
                  <div className="rounded-lg bg-secondary/30 p-2.5">
                    <dt className="text-muted-foreground text-[10px]">Paid YTD</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {formatCurrency(a.rentPaidYtd)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2.5">
                    <dt className="text-muted-foreground text-[10px]">Outstanding</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {formatCurrency(a.rentOutstanding)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-2.5">
                    <dt className="text-muted-foreground text-[10px]">Balance</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {formatCurrency(a.currentBalance)}
                    </dd>
                  </div>
                  <div
                    className={
                      a.arrearsAmount > 0
                        ? 'rounded-lg border border-destructive/25 bg-destructive/5 p-2.5'
                        : 'rounded-lg bg-secondary/30 p-2.5'
                    }
                  >
                    <dt className="text-muted-foreground text-[10px]">Arrears</dt>
                    <dd
                      className={
                        a.arrearsAmount > 0
                          ? 'text-destructive mt-0.5 font-semibold tabular-nums'
                          : 'mt-0.5 font-semibold'
                      }
                    >
                      {a.arrearsAmount > 0
                        ? `${formatCurrency(a.arrearsAmount)} (${a.daysInArrears}d)`
                        : 'None'}
                    </dd>
                  </div>
                </dl>
                {a.collectionActivity.length > 0 && (
                  <div className="space-y-2 border-t border-border/80 px-4 py-3">
                    <p className="text-xs font-semibold">Collection activity</p>
                    {a.collectionActivity.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2.5 rounded-xl bg-secondary/40 px-3 py-2.5 text-xs"
                      >
                        {c.type === 'phone' && (
                          <Phone className="text-primary mt-0.5 size-3.5 shrink-0" />
                        )}
                        {c.type === 'email' && (
                          <Mail className="text-primary mt-0.5 size-3.5 shrink-0" />
                        )}
                        {c.type === 'sms' && (
                          <MessageSquare className="text-primary mt-0.5 size-3.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{c.summary}</p>
                          {c.detail && (
                            <p className="text-muted-foreground mt-0.5 leading-relaxed">{c.detail}</p>
                          )}
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            {formatDateTime(c.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
