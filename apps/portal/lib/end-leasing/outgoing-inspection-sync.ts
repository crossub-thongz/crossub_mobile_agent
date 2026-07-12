import type { InspectionDetail } from '@/lib/inspections-types';

import type { ReportComparisonRepairItem } from './types';

export const OUTGOING_TENANT_RESPONSIBILITY_TAG = 'Tenant Responsible';
export const OUTGOING_LANDLORD_RESPONSIBILITY_TAG = 'Landlord Responsible';

function normalizeAreaName(name: string | null | undefined): string {
  return (name ?? 'General').replace(/ \(Outgoing\)$/, '').trim() || 'General';
}

function itemMatchesResponsibility(
  conditionTags: string[],
  responsibilityTag: string,
): boolean {
  const target = responsibilityTag.toLowerCase();
  return conditionTags.some((tag) => tag.toLowerCase() === target);
}

function responsibilityRowsFromOutgoing(
  detail: InspectionDetail,
  responsibilityTag: string,
): ReportComparisonRepairItem[] {
  const rows: ReportComparisonRepairItem[] = [];
  for (const area of detail.areas) {
    const areaName = normalizeAreaName(area.name);
    for (const item of area.items) {
      const tags = item.conditionTags ?? [];
      if (!itemMatchesResponsibility(tags, responsibilityTag)) continue;
      const description =
        item.comment?.trim() || item.name?.trim() || 'Issue noted on outgoing report';
      if (!description) continue;
      rows.push({
        area: areaName,
        description,
        quote: '',
        handymanId: null,
        handymanName: '',
      });
    }
  }
  return rows;
}

/** Legacy fallback when inspector flagged issues without responsibility tags. */
function flaggedFallbackRows(detail: InspectionDetail): ReportComparisonRepairItem[] {
  const rows: ReportComparisonRepairItem[] = [];
  for (const area of detail.areas) {
    const areaName = normalizeAreaName(area.name);
    for (const item of area.items) {
      if (!item.flagged && item.conditionTags.length === 0 && !item.comment) continue;
      if ((item.conditionTags ?? []).length > 0) continue;
      rows.push({
        area: areaName,
        description:
          item.comment?.trim() || item.name?.trim() || 'Issue noted on outgoing report',
        quote: '',
        handymanId: null,
        handymanName: '',
      });
    }
  }
  return rows;
}

export function extractTenantResponsibilityFromOutgoing(
  detail: InspectionDetail,
): ReportComparisonRepairItem[] {
  const tagged = responsibilityRowsFromOutgoing(detail, OUTGOING_TENANT_RESPONSIBILITY_TAG);
  return tagged.length > 0 ? tagged : flaggedFallbackRows(detail);
}

export function extractLandlordResponsibilityFromOutgoing(
  detail: InspectionDetail,
): ReportComparisonRepairItem[] {
  return responsibilityRowsFromOutgoing(detail, OUTGOING_LANDLORD_RESPONSIBILITY_TAG);
}

function itemKey(item: Pick<ReportComparisonRepairItem, 'area' | 'description'>): string {
  return `${item.area.trim().toLowerCase()}|${item.description.trim().toLowerCase()}`;
}

/** Merge inspector-authored rows with saved quote / handyman fields. */
export function mergeInspectionResponsibilityItems(
  saved: ReportComparisonRepairItem[],
  fromInspection: ReportComparisonRepairItem[],
): ReportComparisonRepairItem[] {
  const savedByKey = new Map(saved.map((item) => [itemKey(item), item]));
  return fromInspection.map((item) => {
    const prior = savedByKey.get(itemKey(item));
    return {
      ...item,
      quote: prior?.quote ?? item.quote,
      handymanId: prior?.handymanId ?? item.handymanId,
      handymanName: prior?.handymanName ?? item.handymanName,
      localKey: prior?.localKey,
    };
  });
}

export function responsibilityItemsEqual(
  a: ReportComparisonRepairItem[],
  b: ReportComparisonRepairItem[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.area === other.area &&
      item.description === other.description &&
      (item.quote ?? '') === (other.quote ?? '') &&
      (item.handymanId ?? '') === (other.handymanId ?? '') &&
      (item.handymanName ?? '') === (other.handymanName ?? '')
    );
  });
}
