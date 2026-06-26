'use client';

import { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ApprovalPanel } from '@/components/agent/approval-panel';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { ModuleCommunications } from '@/components/agent/module-communications';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { buildRentReviewTimeline, isRentReviewDecided } from '@/lib/rent-review';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAgentStore } from '@/lib/store';

export default function RentReviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { rentReviews } = useAgentData();
  const item = rentReviews.find((r) => r.id === id);
  const decision = useAgentStore((s) => s.rentReviewDecisions[id]);
  const setDecision = useAgentStore((s) => s.setRentReviewDecision);
  const [customRent, setCustomRent] = useState('');
  const back = useBackNavigation(ROUTES.RENT_REVIEW, 'Rent reviews');
  const decided = item ? isRentReviewDecided(item, decision) : false;
  const timeline = useMemo(
    () => (item ? buildRentReviewTimeline(item, decision) : []),
    [item, decision],
  );

  if (!item) notFound();

  return (
    <AgentShell title="Rent Review" backHref={back.href} backLabel={back.label}>
      <div className="space-y-4">
        <DataSourceBadge source="demo" />
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <StatusBadge label={item.status} variant="approval" />
          <p className="font-semibold">{item.propertyAddress}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Lease</dt>
              <dd className="font-medium">
                {formatDate(item.leaseStart)} – {formatDate(item.leaseEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Review due</dt>
              <dd className="font-medium">{formatDate(item.reviewDue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current rent</dt>
              <dd className="font-medium">{formatCurrency(item.currentRent)}/wk</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CROSSUB suggested</dt>
              <dd className="text-primary font-medium">
                {formatCurrency(item.suggestedRent)}/wk
              </dd>
            </div>
          </dl>
          <LinkButton href={ROUTES.REPORTS}>Download comparable market PDF</LinkButton>
        </div>

        <CaseContactActions propertyId={item.propertyId} caseLabel="Rent review" />

        {!decided ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-primary text-xs font-semibold uppercase">
              Confirm rent review
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setDecision(id, { action: 'confirmed' });
                toast.success('Rent review confirmed — tenant notice will be sent');
              }}
            >
              Agree with CROSSUB suggested {formatCurrency(item.suggestedRent)}/wk
            </Button>
            <div className="space-y-2">
              <Label htmlFor="custom">Or enter proposed rent ($/week)</Label>
              <Input
                id="custom"
                type="number"
                value={customRent}
                onChange={(e) => setCustomRent(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={!customRent}
                onClick={() => {
                  setDecision(id, { action: 'custom', amount: Number(customRent) });
                  toast.success('Custom rent submitted');
                }}
              >
                Submit custom amount
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-primary/5 p-4 text-sm">
            {decision ? (
              <>
                Decision recorded:{' '}
                {decision.action === 'confirmed'
                  ? `Agreed ${formatCurrency(item.suggestedRent)}/wk`
                  : `Proposed ${formatCurrency(decision.amount ?? 0)}/wk`}
              </>
            ) : (
              <>
                Rent review confirmed —{' '}
                {formatCurrency(item.suggestedRent ?? item.currentRent)}/wk
              </>
            )}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <Timeline entries={timeline} />
        </section>

        <ModuleCommunications
          propertyId={item.propertyId}
          categories={['Leasing']}
          title="Rent review communications"
        />
      </div>
    </AgentShell>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-primary block text-xs font-medium">
      {children} →
    </a>
  );
}
