'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Mail, MessageSquare, Phone } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
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
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-muted-foreground text-[10px]">Rental income (YTD)</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-muted-foreground text-[10px]">Total arrears</p>
            <p className="mt-1 text-lg font-semibold text-destructive">
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
              <div key={a.propertyId} className="rounded-xl border bg-card p-4">
                <Link
                  href={`${propertyDetail(a.propertyId)}?tab=Accounting`}
                  className="flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{a.propertyAddress}</p>
                    <p className="text-muted-foreground text-xs">{a.tenantName}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4" />
                </Link>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Paid YTD</dt>
                    <dd className="font-medium">{formatCurrency(a.rentPaidYtd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Outstanding</dt>
                    <dd className="font-medium">{formatCurrency(a.rentOutstanding)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-medium">{formatCurrency(a.currentBalance)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Arrears</dt>
                    <dd
                      className={
                        a.arrearsAmount > 0 ? 'font-medium text-destructive' : 'font-medium'
                      }
                    >
                      {a.arrearsAmount > 0
                        ? `${formatCurrency(a.arrearsAmount)} (${a.daysInArrears}d)`
                        : 'None'}
                    </dd>
                  </div>
                </dl>
                {a.collectionActivity.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <p className="text-xs font-semibold">Collection activity</p>
                    {a.collectionActivity.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2 rounded-lg bg-secondary/40 px-2 py-2 text-xs"
                      >
                        {c.type === 'phone' && <Phone className="text-primary mt-0.5 size-3.5 shrink-0" />}
                        {c.type === 'email' && <Mail className="text-primary mt-0.5 size-3.5 shrink-0" />}
                        {c.type === 'sms' && (
                          <MessageSquare className="text-primary mt-0.5 size-3.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{c.summary}</p>
                          {c.detail && (
                            <p className="text-muted-foreground mt-0.5">{c.detail}</p>
                          )}
                          <p className="text-muted-foreground mt-0.5 text-[10px]">
                            {formatDateTime(c.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
