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

type ServerRoutineScheduleView = {
  id: string;
  propertyId: string;
  currentInspection?: { id: string } | null;
};

const unwrap = async (
  p: Promise<{ schedule: ServerRoutineScheduleView }>,
): Promise<ServerRoutineScheduleView> => (await p).schedule;

export const routineInspectionApi = {
  create: (input: CreateRoutineScheduleInput) =>
    unwrap(api.post<{ schedule: ServerRoutineScheduleView }>('/inspections/routine', input)),
};
