import type {
  MaintenanceWorkspaceCase,
  MaintenanceWorkspaceParty,
} from '@/lib/maintenance-workspace/types';
import type { Property } from '@/lib/types';

function partyFromFields(
  name?: string | null,
  email?: string | null,
  phone?: string | null,
): MaintenanceWorkspaceParty | undefined {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim();
  if (!trimmedName && !trimmedEmail && !trimmedPhone) return undefined;
  return {
    name: trimmedName || '—',
    email: trimmedEmail || undefined,
    phone: trimmedPhone || undefined,
  };
}

function mergeParty(
  primary?: MaintenanceWorkspaceParty,
  fallback?: MaintenanceWorkspaceParty,
): MaintenanceWorkspaceParty | undefined {
  if (!primary && !fallback) return undefined;
  return {
    name: primary?.name?.trim() || fallback?.name?.trim() || '—',
    email: primary?.email?.trim() || fallback?.email?.trim() || undefined,
    phone: primary?.phone?.trim() || fallback?.phone?.trim() || undefined,
  };
}

export function resolveMaintenanceStrataContacts(
  workspaceCase: Pick<
    MaintenanceWorkspaceCase,
    'buildingName' | 'strataPlanNumber' | 'buildingManager' | 'strataContact'
  >,
  property?: Property,
) {
  const buildingManager = mergeParty(
    workspaceCase.buildingManager,
    partyFromFields(
      property?.buildingManagerName,
      property?.buildingManagerEmail,
      property?.buildingManagerPhone,
    ),
  );
  const strataContact = mergeParty(
    workspaceCase.strataContact,
    partyFromFields(
      property?.strataContactName,
      property?.strataContactEmail,
      property?.strataContactPhone,
    ),
  );

  return {
    buildingName: workspaceCase.buildingName?.trim() || property?.buildingName?.trim() || null,
    strataPlanNumber:
      workspaceCase.strataPlanNumber?.trim() || property?.strataPlanNumber?.trim() || null,
    buildingManager,
    strataContact,
  };
}
