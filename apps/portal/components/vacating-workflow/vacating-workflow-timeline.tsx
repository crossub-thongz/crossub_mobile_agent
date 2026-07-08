'use client';

import { useEffect, useRef } from 'react';

import { VacatingLifecycleTabs } from '@/components/vacating-workflow/vacating-lifecycle-tabs';
import { useVacatingWorkflowStore } from '@/lib/vacating/store';
import { useVacatingCaseLiveSync } from '@/lib/use-vacating-case-live-sync';
import type { Inspection, VacatingCase } from '@/lib/types';

export function VacatingWorkflowTimeline({
  vacatingCase,
  outgoingInspection,
}: {
  vacatingCase: VacatingCase;
  outgoingInspection?: Inspection;
}) {
  const ensureDetail = useVacatingWorkflowStore((s) => s.ensureDetail);
  const resetActiveStepToHint = useVacatingWorkflowStore((s) => s.resetActiveStepToHint);
  const detail = useVacatingWorkflowStore((s) => s.getDetail(vacatingCase.id));
  const initializedIdRef = useRef<string | null>(null);

  useVacatingCaseLiveSync(vacatingCase, outgoingInspection);

  useEffect(() => {
    const seeded = ensureDetail(vacatingCase, outgoingInspection);
    if (initializedIdRef.current !== vacatingCase.id) {
      resetActiveStepToHint(vacatingCase.id, seeded.activeStepHint);
      initializedIdRef.current = vacatingCase.id;
    }
  }, [ensureDetail, resetActiveStepToHint, vacatingCase, outgoingInspection]);

  if (!detail) return null;

  return <VacatingLifecycleTabs detail={detail} inspection={outgoingInspection} />;
}
