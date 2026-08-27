'use client';

import { useEffect } from 'react';

import {
  formatRecentCaseLabel,
  recordRecentCaseVisit,
  type RecentCaseModule,
} from '@/lib/recent-cases';
import { recordRecentPropertyVisit } from '@/lib/recent-properties';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';
import type { WorkflowCaseRefKind } from '@/lib/workflow-case-reference';

export function useRecordRecentPropertyVisit(property: Property | undefined | null) {
  const propertyId = property?.id;
  const label = property ? formatPropertyFullAddress(property) : '';
  useEffect(() => {
    if (!propertyId) return;
    recordRecentPropertyVisit(propertyId, label);
  }, [label, propertyId]);
}

export function useRecordRecentCaseVisit(input: {
  id?: string;
  kind: WorkflowCaseRefKind;
  address?: string | null;
  href: string;
  module: RecentCaseModule;
}) {
  useEffect(() => {
    if (!input.id) return;
    recordRecentCaseVisit({
      id: input.id,
      label: formatRecentCaseLabel(input.id, input.kind, input.address),
      href: input.href,
      module: input.module,
    });
  }, [input.address, input.href, input.id, input.kind, input.module]);
}
