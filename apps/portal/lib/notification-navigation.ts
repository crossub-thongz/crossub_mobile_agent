import {
  inspectionToJobRow,
  leasingCycleToJobRow,
  maintenanceToJobRow,
  rentReviewToJobRow,
  tribunalToJobRow,
  vacatingToJobRow,
  type PortfolioAgentData,
} from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';

function notificationPathname(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).pathname;
    }
  } catch {
    // fall through
  }
  const q = trimmed.indexOf('?');
  return (q >= 0 ? trimmed.slice(0, q) : trimmed).replace(/\/+$/, '') || '/';
}

/** Map an agent notification deep-link onto the portfolio job popup row, when possible. */
export function notificationHrefToJobRow(
  href: string,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  const segments = notificationPathname(href).split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const [root, second, third] = segments;

  if (root === 'rent-review' && second) {
    const item = data.rentReviews.find((row) => row.id === second);
    return item ? rentReviewToJobRow(item, data.rentReviewDecisions) : null;
  }

  if (root === 'maintenance' && second) {
    const item = data.maintenanceAll.find((row) => row.id === second);
    return item ? maintenanceToJobRow(item) : null;
  }

  if (root === 'tribunal' && second) {
    const item = data.tribunalCases.find((row) => row.id === second);
    return item ? tribunalToJobRow(item) : null;
  }

  if (root === 'inspections') {
    const id = third ?? second;
    if (id && id !== 'new') {
      const item = data.inspections.find((row) => row.id === id);
      return item ? inspectionToJobRow(item) : null;
    }
  }

  if (root === 'vacating' && second === 'outgoing' && third) {
    const item = data.inspections.find((row) => row.id === third);
    return item ? inspectionToJobRow(item) : null;
  }

  if (root === 'vacating' && second && second !== 'outgoing') {
    const item = data.vacating.find((row) => row.id === second);
    return item ? vacatingToJobRow(item, data) : null;
  }

  if (root === 'properties' && second && third === 'leasing-workflow') {
    const propertyId = second;
    const cycle = data.leasingCycles.find((row) => row.propertyId === propertyId);
    return cycle ? leasingCycleToJobRow(cycle, data) : null;
  }

  if (root === 'tenant-selection' && second) {
    const item = data.tenantSelections.find((row) => row.id === second);
    if (!item?.propertyId) return null;
    const cycle = data.leasingCycles.find((row) => row.propertyId === item.propertyId);
    return cycle ? leasingCycleToJobRow(cycle, data) : null;
  }

  return null;
}
