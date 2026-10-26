import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/**
 * Self-Manage open inspections on a letting: the agency runs as many opens as it needs until
 * the property is leased, each its own viewing with its own report. Every write returns the
 * letting's full list of opens.
 */

export type LettingOpenInspections = components['schemas']['AgentLettingOpenInspectionsDto'];
export type LettingOpenInspection = components['schemas']['AgentLettingOpenInspectionDto'];
export type LettingOpenInspectionStatus = LettingOpenInspection['status'];
export type AddLettingOpenInspectionInput = components['schemas']['AgentAddLettingOpenInspectionDto'];
export type CancelLettingOpenInspectionInput =
  components['schemas']['AgentCancelLettingOpenInspectionDto'];

const lettingPath = (propertyId: string, cycleId: string) => ({ propertyId, cycleId });
const openPath = (propertyId: string, cycleId: string, sessionId: string) => ({
  ...lettingPath(propertyId, cycleId),
  sessionId,
});

export async function listLettingOpenInspections(
  propertyId: string,
  cycleId: string,
): Promise<LettingOpenInspections> {
  const result = await crossub.GET(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections',
    { params: { path: lettingPath(propertyId, cycleId) } },
  );
  return unwrapCrossubResult(result, "Couldn't load the open inspections");
}

export async function addLettingOpenInspection(
  propertyId: string,
  cycleId: string,
  body: AddLettingOpenInspectionInput,
): Promise<LettingOpenInspections> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections',
    { params: { path: lettingPath(propertyId, cycleId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't schedule the open inspection");
}

export async function startLettingOpenInspection(
  propertyId: string,
  cycleId: string,
  sessionId: string,
): Promise<LettingOpenInspections> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections/{sessionId}/start',
    { params: { path: openPath(propertyId, cycleId, sessionId) } },
  );
  return unwrapCrossubResult(result, "Couldn't start the open inspection");
}

export async function closeLettingOpenInspection(
  propertyId: string,
  cycleId: string,
  sessionId: string,
): Promise<LettingOpenInspections> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections/{sessionId}/close',
    { params: { path: openPath(propertyId, cycleId, sessionId) } },
  );
  return unwrapCrossubResult(result, "Couldn't finish the open inspection");
}

export async function cancelLettingOpenInspection(
  propertyId: string,
  cycleId: string,
  sessionId: string,
  body: CancelLettingOpenInspectionInput,
): Promise<LettingOpenInspections> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections/{sessionId}/cancel',
    { params: { path: openPath(propertyId, cycleId, sessionId) }, body },
  );
  return unwrapCrossubResult(result, "Couldn't cancel the open inspection");
}

export async function generateLettingOpenInspectionReport(
  propertyId: string,
  cycleId: string,
  sessionId: string,
): Promise<LettingOpenInspections> {
  const result = await crossub.POST(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections/{sessionId}/report/generate',
    { params: { path: openPath(propertyId, cycleId, sessionId) } },
  );
  return unwrapCrossubResult(result, "Couldn't generate the open inspection report");
}

/** One open's report PDF as a blob, for a named download. */
export async function downloadLettingOpenInspectionReport(
  propertyId: string,
  cycleId: string,
  sessionId: string,
): Promise<Blob> {
  const result = await crossub.GET(
    '/agent/properties/{propertyId}/workflows/leasing-cycle/{cycleId}/open-inspections/{sessionId}/report/pdf',
    {
      params: { path: openPath(propertyId, cycleId, sessionId), query: { download: 'true' } },
      parseAs: 'blob',
    },
  );
  return unwrapCrossubResult(result, "Couldn't download the open inspection report");
}
