import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { isPropertyVacant, rentReviewsForProperty } from '@/lib/property-leasing';
import {
  accountingJobRows,
  inspectionJobRows,
  leasingWorkflowJobRows,
  maintenanceJobRows,
  rentReviewJobRows,
  tribunalJobRows,
  type PropertyJobRow,
} from '@/lib/property-job-rows';
import type { RentReviewDecision } from '@/lib/rent-review';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import type { SystemSearchResult } from '@/lib/agent-system-search';

export type PortfolioAgentData = {
  properties: Property[];
  maintenanceAll: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
  tribunalCases: TribunalCase[];
  vacating: VacatingCase[];
  accounting: PropertyAccounting[];
  leasingCycles: LeasingCycle[];
  leasingRecords: LeasingRecord[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
};

export function resolvePortfolioCasePropertyId(
  job: PropertyJobRow,
  data: Pick<
    PortfolioAgentData,
    | 'maintenanceAll'
    | 'inspections'
    | 'rentReviews'
    | 'leasingCycles'
    | 'vacating'
    | 'tribunalCases'
    | 'accounting'
  >,
): string | null {
  switch (job.kind) {
    case 'maintenance':
      return data.maintenanceAll.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'inspection':
      return data.inspections.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'rent_review':
      return data.rentReviews.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'leasing':
      return data.leasingCycles.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'end_leasing':
      return data.vacating.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'tribunal':
      return data.tribunalCases.find((row) => row.id === job.id)?.propertyId ?? null;
    case 'accounting':
      if (job.id.startsWith('arrears-')) return job.id.slice('arrears-'.length);
      if (job.id.startsWith('recon-')) return job.id.slice('recon-'.length);
      return data.accounting.find((row) => `arrears-${row.propertyId}` === job.id)?.propertyId ?? null;
    default:
      return null;
  }
}

export function resolvePortfolioCaseContext(
  job: PropertyJobRow,
  data: PortfolioAgentData,
): {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  leasingCases: ReturnType<typeof buildPropertyLeasingWorkflowCases>;
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting: PropertyAccounting | null;
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  isVacant: boolean;
} | null {
  const propertyId = resolvePortfolioCasePropertyId(job, data);
  if (!propertyId) return null;

  const property = data.properties.find((row) => row.id === propertyId);
  if (!property) return null;

  const maintenance = data.maintenanceAll.filter(
    (row) => row.propertyId === propertyId || row.propertyAddress.includes(property.address),
  );
  const inspections = data.inspections.filter((row) => row.propertyId === propertyId);
  const rentReviews = rentReviewsForProperty(data.rentReviews, propertyId, property);
  const vacatingCases = data.vacating.filter((row) => row.propertyId === propertyId);
  const tribunalCases = data.tribunalCases.filter((row) => row.propertyId === propertyId);
  const tenantSelections = data.tenantSelections.filter((row) => row.propertyId === propertyId);
  const propertyLeasingCycles = data.leasingCycles.filter((row) => row.propertyId === propertyId);
  const currentTenancy = data.leasingRecords.filter(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );
  const currentLease = currentTenancy[0];
  const isVacant = isPropertyVacant(property, currentTenancy);

  const leasingCases = buildPropertyLeasingWorkflowCases({
    propertyId,
    leasingCycles: propertyLeasingCycles,
    tenantSelections,
    vacatingCases,
    rentReviews,
    rentReviewDecisions: data.rentReviewDecisions,
    currentLease,
    isVacant,
  });

  return {
    property,
    propertyId,
    maintenance,
    inspections,
    rentReviews,
    leasingCases,
    vacatingCases,
    tribunalCases,
    accounting: data.accounting.find((row) => row.propertyId === propertyId) ?? null,
    tenantSelections,
    currentLease,
    isVacant,
  };
}

export function maintenanceToJobRow(item: MaintenanceRequest): PropertyJobRow {
  return maintenanceJobRows([item])[0]!;
}

export function inspectionToJobRow(item: Inspection): PropertyJobRow {
  return inspectionJobRows([item])[0]!;
}

export function rentReviewToJobRow(
  item: RentReviewCase,
  decisions: PortfolioAgentData['rentReviewDecisions'],
): PropertyJobRow {
  return rentReviewJobRows([item], decisions)[0]!;
}

export function tribunalToJobRow(item: TribunalCase): PropertyJobRow {
  return tribunalJobRows([item])[0]!;
}

export function accountingToJobRow(item: PropertyAccounting): PropertyJobRow | null {
  return accountingJobRows(item)[0] ?? null;
}

/** Portfolio accounting row — opens arrears workflow when present, otherwise reconciliation summary. */
export function accountingPortfolioToJobRow(item: PropertyAccounting): PropertyJobRow {
  const arrears = accountingToJobRow(item);
  if (arrears) return arrears;

  return {
    id: `recon-${item.propertyId}`,
    kind: 'accounting',
    jobType: 'Accounting',
    name: 'Rent reconciliation',
    description: `${item.tenantName} · ${item.propertyAddress}`,
    date: '—',
    createdAt: '—',
    createdAtMs: 0,
    status: item.arrearsAmount > 0 ? 'Collection in progress' : 'Up to date',
    phase: 'in_progress',
  };
}

export function accountingPortfolioJobId(item: PropertyAccounting): string {
  return accountingPortfolioToJobRow(item).id;
}

export function tenantSelectionToJobRow(
  item: TenantSelectionCase,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  if (!item.propertyId) return null;
  const workflowCase = leasingCasesForProperty(item.propertyId, data).find(
    (row) => row.id === item.id,
  );
  return workflowCase ? (leasingWorkflowJobRows([workflowCase])[0] ?? null) : null;
}

export function vacatingToJobRow(
  item: VacatingCase,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  const workflowCase = leasingCasesForProperty(item.propertyId, data).find(
    (row) => row.id === item.id && row.category === 'end_leasing',
  );
  return workflowCase ? (leasingWorkflowJobRows([workflowCase])[0] ?? null) : null;
}

function leasingCasesForProperty(
  propertyId: string,
  data: PortfolioAgentData,
): ReturnType<typeof buildPropertyLeasingWorkflowCases> {
  const property = data.properties.find((row) => row.id === propertyId);
  if (!property) return [];

  const currentTenancy = data.leasingRecords.filter(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  return buildPropertyLeasingWorkflowCases({
    propertyId,
    leasingCycles: data.leasingCycles.filter((row) => row.propertyId === propertyId),
    tenantSelections: data.tenantSelections.filter((row) => row.propertyId === propertyId),
    vacatingCases: data.vacating.filter((row) => row.propertyId === propertyId),
    rentReviews: rentReviewsForProperty(data.rentReviews, propertyId, property),
    rentReviewDecisions: data.rentReviewDecisions,
    currentLease: currentTenancy[0],
    isVacant: isPropertyVacant(property, currentTenancy),
  });
}

/** Map a need-action row onto the portfolio job popup (instead of the legacy full-page workflow). */
export function needActionToJobRow(
  action: PropertyNeedAction,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  if (action.id.startsWith('mnt-')) {
    const item = data.maintenanceAll.find((row) => row.id === action.id.slice(4));
    return item ? maintenanceToJobRow(item) : null;
  }

  if (action.id.startsWith('rr-')) {
    const item = data.rentReviews.find((row) => row.id === action.id.slice(3));
    return item ? rentReviewToJobRow(item, data.rentReviewDecisions) : null;
  }

  if (action.id.startsWith('insp-report-')) {
    const item = data.inspections.find((row) => row.id === action.id.slice('insp-report-'.length));
    return item ? inspectionToJobRow(item) : null;
  }

  if (action.id.startsWith('insp-')) {
    const item = data.inspections.find((row) => row.id === action.id.slice(5));
    return item ? inspectionToJobRow(item) : null;
  }

  if (action.id.startsWith('ts-')) {
    const selectionId = action.id.slice(3);
    const workflowCase = leasingCasesForProperty(action.propertyId, data).find(
      (row) => row.id === selectionId,
    );
    return workflowCase ? leasingWorkflowJobRows([workflowCase])[0] ?? null : null;
  }

  if (action.id.startsWith('trib-')) {
    const item = data.tribunalCases.find((row) => row.id === action.id.slice(5));
    return item ? tribunalToJobRow(item) : null;
  }

  if (action.id.startsWith('arrears-')) {
    const item = data.accounting.find((row) => row.propertyId === action.propertyId);
    return item ? accountingToJobRow(item) : null;
  }

  if (action.id.startsWith('vacant-')) {
    const workflowCase =
      leasingCasesForProperty(action.propertyId, data).find((row) => row.category === 'leasing') ??
      null;
    return workflowCase ? leasingWorkflowJobRows([workflowCase])[0] ?? null : null;
  }

  if (action.id.startsWith('lease-expiry-')) {
    const workflowCase =
      leasingCasesForProperty(action.propertyId, data).find(
        (row) => row.category === 'rent_review',
      ) ?? null;
    if (workflowCase) return leasingWorkflowJobRows([workflowCase])[0] ?? null;
    const review = data.rentReviews.find((row) => row.propertyId === action.propertyId);
    return review ? rentReviewToJobRow(review, data.rentReviewDecisions) : null;
  }

  return null;
}

/** Map a Gii local-search hit onto the portfolio job popup when it references a case row. */
export function searchResultToJobRow(
  result: SystemSearchResult,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  if (result.id.startsWith('maint-')) {
    const item = data.maintenanceAll.find((row) => row.id === result.id.slice(6));
    return item ? maintenanceToJobRow(item) : null;
  }
  if (result.id.startsWith('insp-')) {
    const item = data.inspections.find((row) => row.id === result.id.slice(5));
    return item ? inspectionToJobRow(item) : null;
  }
  if (result.id.startsWith('rr-')) {
    const item = data.rentReviews.find((row) => row.id === result.id.slice(3));
    return item ? rentReviewToJobRow(item, data.rentReviewDecisions) : null;
  }
  if (result.id.startsWith('vac-')) {
    const item = data.vacating.find((row) => row.id === result.id.slice(4));
    if (!item) return null;
    const workflowCase = leasingCasesForProperty(item.propertyId, data).find(
      (row) => row.id === item.id && row.category === 'end_leasing',
    );
    return workflowCase ? leasingWorkflowJobRows([workflowCase])[0] ?? null : null;
  }
  if (result.id.startsWith('ts-')) {
    const item = data.tenantSelections.find((row) => row.id === result.id.slice(3));
    if (!item?.propertyId) return null;
    const workflowCase = leasingCasesForProperty(item.propertyId, data).find(
      (row) => row.id === item.id,
    );
    return workflowCase ? leasingWorkflowJobRows([workflowCase])[0] ?? null : null;
  }
  if (result.id.startsWith('tri-')) {
    const item = data.tribunalCases.find((row) => row.id === result.id.slice(4));
    return item ? tribunalToJobRow(item) : null;
  }
  return null;
}

export function leasingCycleToJobRow(
  cycle: LeasingCycle,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  const property = data.properties.find((row) => row.id === cycle.propertyId);
  if (!property) return null;

  const propertyId = cycle.propertyId;
  const rentReviews = rentReviewsForProperty(data.rentReviews, propertyId, property);
  const vacatingCases = data.vacating.filter((row) => row.propertyId === propertyId);
  const tenantSelections = data.tenantSelections.filter((row) => row.propertyId === propertyId);
  const propertyLeasingCycles = data.leasingCycles.filter((row) => row.propertyId === propertyId);
  const currentTenancy = data.leasingRecords.filter(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );

  const workflowCase = buildPropertyLeasingWorkflowCases({
    propertyId,
    leasingCycles: propertyLeasingCycles,
    tenantSelections,
    vacatingCases,
    rentReviews,
    rentReviewDecisions: data.rentReviewDecisions,
    currentLease: currentTenancy[0],
    isVacant: isPropertyVacant(property, currentTenancy),
  }).find((row) => row.id === cycle.id);

  if (!workflowCase) return null;
  return leasingWorkflowJobRows([workflowCase])[0] ?? null;
}
