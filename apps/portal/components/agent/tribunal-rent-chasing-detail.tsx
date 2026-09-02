'use client';

import { TribunalAwaitingAccountManagerPanel } from '@/components/agent/tribunal-awaiting-account-manager';

/** Lodged rent-chasing cases wait on the Account Manager — the previous agent workflow is hidden. */
export function TribunalRentChasingDetail({ caseId: _caseId }: { caseId: string }) {
  return <TribunalAwaitingAccountManagerPanel kind="rent_chasing" />;
}
