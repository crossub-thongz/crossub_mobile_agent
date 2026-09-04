import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import type { Inspection } from '@/lib/types';

export function isAgentConductedOpenSession(session: OpenInspectionSession): boolean {
  return resolveOpenConductedByFromSession(session) === 'agent';
}

/** Session-only heuristic — leasing `agentConducted` overrides when present. */
export function resolveOpenConductedByFromSession(
  session: OpenInspectionSession,
): 'agent' | 'crossub' {
  const note = session.shortNote?.toLowerCase() ?? '';
  if (note.includes('agent-conducted open')) return 'agent';
  if (session.inspectionId?.trim()) return 'crossub';
  if (session.leasingCycleId?.trim()) return 'crossub';
  if (session.tenantMovedOut != null) return 'crossub';
  if (session.rental?.rentPerWeek != null) return 'crossub';
  return 'agent';
}

export function resolveOpenConductedBy(args: {
  session?: OpenInspectionSession | null;
  leasingDetail?: LeasingPropertyDetail | null;
  inspection?: Pick<Inspection, 'openConductedBy'> | null;
}): 'agent' | 'crossub' {
  if (args.leasingDetail?.openInspection.agentConducted === true) return 'agent';
  if (args.leasingDetail?.openInspection.agentConducted === false) return 'crossub';
  if (args.session) return resolveOpenConductedByFromSession(args.session);
  if (args.inspection?.openConductedBy === 'agent') return 'agent';
  return 'crossub';
}

export function isCrossubManagedOpenInspection(args: {
  session?: OpenInspectionSession | null;
  leasingDetail?: LeasingPropertyDetail | null;
  inspection?: Pick<Inspection, 'type' | 'openConductedBy'> | null;
}): boolean {
  if (args.inspection?.type !== 'OPEN') return false;
  return resolveOpenConductedBy(args) === 'crossub';
}
