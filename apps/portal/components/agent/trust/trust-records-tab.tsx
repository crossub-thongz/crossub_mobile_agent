'use client';

import { useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { TrustAuditLogPanel } from '@/components/agent/trust/trust-audit-log-panel';
import { TrustLedgersTab } from '@/components/agent/trust/trust-ledgers-tab';
import { TrustReportsTab } from '@/components/agent/trust/trust-reports-tab';
import { TRUST_RECORDS_VIEW, TRUST_RECORDS_VIEWS, type TrustRecordsView } from '@/constants/trust';
import type { TrustAccountCode } from '@/lib/crossub-api/agent-trust-client';

/** Records & Reports: folios, trust reports and the audit log behind one set of chips. */
export function TrustRecordsTab({
  agencyId,
  bankAccountId,
  accountCodes,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
}) {
  const [view, setView] = useState<TrustRecordsView>(TRUST_RECORDS_VIEW.FOLIOS);

  return (
    <div className="space-y-4">
      <FilterChips options={TRUST_RECORDS_VIEWS} value={view} onChange={setView} />
      {view === TRUST_RECORDS_VIEW.FOLIOS ? (
        <TrustLedgersTab agencyId={agencyId} bankAccountId={bankAccountId} accountCodes={accountCodes} />
      ) : view === TRUST_RECORDS_VIEW.REPORTS ? (
        <TrustReportsTab agencyId={agencyId} bankAccountId={bankAccountId} />
      ) : (
        <TrustAuditLogPanel agencyId={agencyId} />
      )}
    </div>
  );
}
