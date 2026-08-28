'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  getAgencyPortalLevel,
  isLegacyLevel,
  isPropertyInspectionOnly,
} from '@/lib/portal-service-level';
import { cn } from '@/lib/utils';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((ms % MINUTE_MS) / 1000);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function remainingMs(deadlineAt: string, now: number): number {
  const end = new Date(deadlineAt).getTime();
  if (!Number.isFinite(end)) return 0;
  return end - now;
}

export function InspectorConfirmCountdown({
  inspectionId,
  deadlineAt,
  refunded,
  apiStatus,
  onClosed,
  className,
  postpaid,
  propertyId,
  inspectionType,
}: {
  inspectionId: string;
  deadlineAt?: string | null;
  refunded?: boolean;
  apiStatus?: string | null;
  onClosed?: () => void;
  className?: string;
  /** Level 2: fee is voided (not invoiced) instead of Stripe-refunded. */
  postpaid?: boolean;
  propertyId?: string | null;
  inspectionType?: string | null;
}) {
  const { agencies, properties, hasFullManagementAccess, platformBillingDisabled } =
    useAgentData();
  const inferredPostpaid = useMemo(() => {
    if (postpaid != null) return postpaid;
    const agencyId = properties.find((row) => row.id === propertyId)?.agencyId;
    if (agencyId) return !isPropertyInspectionOnly(agencies, agencyId);
    return hasFullManagementAccess;
  }, [postpaid, properties, propertyId, agencies, hasFullManagementAccess]);
  const hideUnbilledOpenTimer = useMemo(() => {
    if ((inspectionType ?? '').toUpperCase() !== 'OPEN') return false;
    const agencyId = properties.find((row) => row.id === propertyId)?.agencyId;
    return isLegacyLevel(getAgencyPortalLevel(agencies, agencyId));
  }, [inspectionType, properties, propertyId, agencies]);
  const [now, setNow] = useState(() => Date.now());
  const [expiring, setExpiring] = useState(false);
  const expireStartedRef = useRef(false);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  const draft = (apiStatus ?? '').toUpperCase() === 'DRAFT';
  const active =
    Boolean(deadlineAt) &&
    draft &&
    !refunded &&
    !hideUnbilledOpenTimer &&
    !platformBillingDisabled;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const remaining = useMemo(
    () => (deadlineAt ? remainingMs(deadlineAt, now) : 0),
    [deadlineAt, now],
  );
  const expired = active && remaining <= 0;

  useEffect(() => {
    if (!expired || expireStartedRef.current) return;
    expireStartedRef.current = true;
    setExpiring(true);
    void inspectionsApi
      .expireUnaccepted(inspectionId)
      .then((updated) => {
        if (updated.unacceptedRefunded || updated.status === 'CANCELLED') {
          toast.info(
            inferredPostpaid
              ? 'This job was closed — you will not be charged because no inspector confirmed in 48 hours.'
              : 'This job was closed and refunded — no inspector confirmed in 48 hours.',
          );
        }
        onClosedRef.current?.();
      })
      .catch(() => {
        onClosedRef.current?.();
      })
      .finally(() => {
        setExpiring(false);
      });
  }, [expired, inspectionId, inferredPostpaid]);

  if (platformBillingDisabled) return null;

  if (refunded) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-slate-400/40 bg-slate-500/10 px-4 py-3',
          className,
        )}
      >
        <p className="text-sm font-semibold">{inferredPostpaid ? 'Not charged' : 'Refunded'}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {inferredPostpaid
            ? 'This job was closed because no inspector confirmed within 48 hours. This fee will not appear on your monthly invoice.'
            : 'This job was closed because no inspector confirmed within 48 hours. The platform fee has been refunded.'}
        </p>
      </div>
    );
  }

  if (!active) return null;

  const timer = formatRemaining(remaining);

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Inspector confirm timer</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            If no inspector confirms this job in 48 hours it will be closed
            {inferredPostpaid ? ' and you will not be charged.' : ' and refunded.'}
          </p>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums tracking-wide">
            {expiring ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Closing…
              </span>
            ) : (
              timer
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
