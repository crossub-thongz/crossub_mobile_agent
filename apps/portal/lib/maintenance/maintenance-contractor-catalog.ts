/** Verified maintenance contractor catalogue (shared network pool — same IDs as admin web). */
export const MAINTENANCE_CONTRACTOR_CATALOG: Array<{ id: string; name: string }> = [
  { id: 'c1', name: 'Apex Flow Solutions' },
  { id: 'c2', name: 'Blue Jet Plumbing' },
  { id: 'c3', name: 'Rapid Response Inc.' },
  { id: 'c4', name: 'TerraShield Pest Services' },
  { id: 'c5', name: 'ProBuild Maintenance' },
  { id: 'c6', name: 'Volt & Spark Electrical' },
  { id: 'c7', name: 'CoolBreeze HVAC' },
  { id: 'c8', name: 'LockSafe Security' },
];

export function maintenanceContractorCatalogName(contractorId: string): string | undefined {
  const hit = MAINTENANCE_CONTRACTOR_CATALOG.find((row) => row.id === contractorId);
  return hit?.name;
}
