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
  useEffect(() => {
    if (!property?.id) return;
    recordRecentPropertyVisit(property.id, formatPropertyFullAddress(property));
  }, [property]);
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
