export function propertyInspectionFocusPath(
  propertyId: string,
  inspectionId: string,
): string {
  const params = new URLSearchParams({
    tab: 'Inspection',
    inspection: inspectionId,
  });
  return `/properties/${propertyId}?${params.toString()}`;
}

export function readPropertyInspectionFocusId(
  searchParams: Pick<URLSearchParams, 'get'>,
): string | null {
  const id = searchParams.get('inspection')?.trim();
  return id || null;
}
