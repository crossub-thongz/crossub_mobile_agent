import { api } from '@/lib/api';

export type InspectorBookableDays = {
  timezone: string;
  from: string;
  to: string;
  dates: string[];
  configuredInspectorCount: number;
};

export async function fetchInspectorBookableDays(
  from?: string,
  to?: string,
): Promise<InspectorBookableDays> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return api.get<InspectorBookableDays>(
    `/agent/inspection-scheduling/bookable-days${qs ? `?${qs}` : ''}`,
  );
}
