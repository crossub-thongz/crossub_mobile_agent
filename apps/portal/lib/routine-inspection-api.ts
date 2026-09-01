import { api } from '@/lib/api';

export type CreateRoutineScheduleInput = {
  propertyId: string;
  flow: 'self' | 'in_person';
  frequency: 2 | 3;
  scheduledDate?: string;
  lastInspectionDate?: string;
  tenantName?: string;
  tenantEmail?: string;
  inspectorName?: string;
  platformChargeId?: string;
};

export type ChangeRoutineFlowInput = {
  flow: 'self' | 'in_person';
  reason: string;
  reasonNote: string;
  inspectionId?: string;
  platformChargeId?: string;
};

export type OverrideRoutineScheduleInput = {
  nextInspectionDate: string;
  frequency: 2 | 3;
  reason: string;
  reasonNote?: string;
};

export type StartRoutineInspectionInput = {
  scheduledDate?: string;
  inspectorName?: string;
  platformChargeId?: string;
};

export type RoutineScheduleByProperty = {
  id: string;
  flow: 'self' | 'in_person';
  frequency: number;
  frequencyMonths: number;
  nextInspectionDate: string | null;
  currentInspectionId?: string | null;
  currentInspectionStatus?: string | null;
};

export type ServerRoutineScheduleAuditEntry = {
  id: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  reasonNote: string | null;
  changedBy: string;
  changedAt: string;
};

export type RestartRoutineInspectionInput = StartRoutineInspectionInput & {
  reason: string;
};

export type ServerRoutineScheduleView = {
  id: string;
  propertyId: string;
  flow: 'self' | 'in_person';
  selfStatus: string | null;
  inPersonStatus?: string | null;
  currentInspectionId: string | null;
  audit?: ServerRoutineScheduleAuditEntry[];
  currentInspection?: {
    id: string;
    status: string;
    reportUrl: string | null;
    completedDate?: string | null;
    declineReason?: string | null;
    previousSubmission?: {
      submittedAt: string;
      reportUrl: string | null;
      sections: Array<{
        id: string;
        room: string;
        description: string;
        photos: string[];
      }>;
    } | null;
  } | null;
};

const BASE = '/inspections/routine';

const unwrap = async (
  p: Promise<{ schedule: ServerRoutineScheduleView }>,
): Promise<ServerRoutineScheduleView> => (await p).schedule;

export const routineInspectionApi = {
  getByProperty: (propertyId: string) =>
    api.get<{ schedule: RoutineScheduleByProperty | null }>(
      `${BASE}/by-property/${propertyId}`,
    ),

  create: (input: CreateRoutineScheduleInput) =>
    unwrap(api.post<{ schedule: ServerRoutineScheduleView }>(BASE, input)),

  override: (scheduleId: string, input: OverrideRoutineScheduleInput) =>
    unwrap(
      api.patch<{ schedule: ServerRoutineScheduleView }>(
        `${BASE}/${scheduleId}/override`,
        input,
      ),
    ),

  changeFlow: (scheduleId: string, input: ChangeRoutineFlowInput) =>
    unwrap(api.patch<{ schedule: ServerRoutineScheduleView }>(`${BASE}/${scheduleId}/flow`, input)),

  start: (scheduleId: string, input: StartRoutineInspectionInput = {}) =>
    unwrap(
      api.post<{ schedule: ServerRoutineScheduleView }>(
        `${BASE}/${scheduleId}/start`,
        input,
      ),
    ),

  restart: (scheduleId: string, input: RestartRoutineInspectionInput) =>
    unwrap(
      api.post<{ schedule: ServerRoutineScheduleView }>(
        `${BASE}/${scheduleId}/restart`,
        input,
      ),
    ),

  getByInspection: (inspectionId: string) =>
    unwrap(api.get<{ schedule: ServerRoutineScheduleView }>(`${BASE}/by-inspection/${inspectionId}`)),

  approveSelf: (scheduleId: string) =>
    unwrap(api.patch<{ schedule: ServerRoutineScheduleView }>(`${BASE}/${scheduleId}/approve-self`, {})),

  declineSelf: (scheduleId: string, input: { reason: string }) =>
    unwrap(
      api.patch<{ schedule: ServerRoutineScheduleView }>(
        `${BASE}/${scheduleId}/decline-self`,
        input,
      ),
    ),
};
