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
};

export type ServerRoutineScheduleView = {
  id: string;
  propertyId: string;
  flow: 'self' | 'in_person';
  selfStatus: string | null;
  currentInspectionId: string | null;
  currentInspection?: {
    id: string;
    status: string;
    reportUrl: string | null;
  } | null;
};

const BASE = '/inspections/routine';

const unwrap = async (
  p: Promise<{ schedule: ServerRoutineScheduleView }>,
): Promise<ServerRoutineScheduleView> => (await p).schedule;

export const routineInspectionApi = {
  create: (input: CreateRoutineScheduleInput) =>
    unwrap(api.post<{ schedule: ServerRoutineScheduleView }>(BASE, input)),

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
