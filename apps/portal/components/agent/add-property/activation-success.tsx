'use client';

import Link from 'next/link';
import { CheckCircle2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  ACTIVATION_SUCCESS_COPY,
  ADD_TENANCY_QUERY_PARAM,
  ADD_TENANCY_QUERY_VALUE,
} from '@/constants/add-property';
import { propertyDetail, propertyNew, ROUTES } from '@/constants/routes';

/** Shown only after the server has activated the property. */
export function ActivationSuccess({
  propertyId,
  addressLine,
  wantsTenancy,
  selfManaged,
}: {
  propertyId: string;
  addressLine: string;
  /** The agent said the property is tenanted, or that a tenancy is arranged. */
  wantsTenancy: boolean;
  /** Self-Manage adds the tenancy itself; a serviced agency records the details for CROSSUB. */
  selfManaged: boolean;
}) {
  const tenancyHref = selfManaged
    ? `${propertyDetail(propertyId)}?section=tenancies&${ADD_TENANCY_QUERY_PARAM}=${ADD_TENANCY_QUERY_VALUE}`
    : propertyDetail(propertyId);

  return (
    <div className="mx-auto max-w-xl space-y-5 rounded-lg border border-border/60 bg-card p-6 text-center">
      <CheckCircle2 className="text-primary mx-auto size-12" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{ACTIVATION_SUCCESS_COPY.HEADING}</h2>
        <p className="text-muted-foreground text-sm">{addressLine}</p>
        <span className="bg-primary/12 text-primary inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {ACTIVATION_SUCCESS_COPY.ACTIVE_BADGE}
        </span>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 p-4 text-left">
        <h3 className="text-sm font-semibold">{ACTIVATION_SUCCESS_COPY.NEXT_HEADING}</h3>
        <p className="text-muted-foreground text-sm">
          {!wantsTenancy
            ? ACTIVATION_SUCCESS_COPY.NEXT_VACANT
            : selfManaged
              ? ACTIVATION_SUCCESS_COPY.NEXT_TENANCY_SELF_MANAGED
              : ACTIVATION_SUCCESS_COPY.NEXT_TENANCY_SERVICED}
        </p>
        {wantsTenancy ? (
          <Button asChild>
            <Link href={tenancyHref}>
              <Plus className="size-4" />
              {selfManaged
                ? ACTIVATION_SUCCESS_COPY.ADD_TENANCY
                : ACTIVATION_SUCCESS_COPY.ADD_TENANCY_DETAILS}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href={propertyDetail(propertyId)}>{ACTIVATION_SUCCESS_COPY.VIEW_PROPERTY}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.PROPERTIES}>{ACTIVATION_SUCCESS_COPY.PROPERTIES}</Link>
        </Button>
        {/* A full page load, so the form starts empty and not on the draft just activated. */}
        <Button asChild variant="outline">
          <a href={propertyNew()}>{ACTIVATION_SUCCESS_COPY.ADD_ANOTHER}</a>
        </Button>
      </div>
    </div>
  );
}
