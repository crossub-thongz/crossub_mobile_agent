import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  vacatingDetail,
} from '@/constants/routes';
import type {
  Inspection,
  MaintenanceRequest,
  RentReviewCase,
  TaskStatusItem,
  VacatingCase,
} from '@/lib/types';

export function buildTaskStatusList(input: {
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  vacating: VacatingCase[];
}): TaskStatusItem[] {
  const items: TaskStatusItem[] = [];

  for (const m of input.maintenance) {
    if (['Closed', 'closed'].includes(m.status)) continue;
    items.push({
      id: `mnt-${m.id}`,
      propertyAddress: m.propertyAddress,
      taskLabel: m.title,
      status: m.status,
      href: maintenanceDetail(m.id),
      module: 'Maintenance',
      tone: m.priority === 'urgent' ? 'urgent' : m.requiresApproval ? 'warning' : 'neutral',
      requiresApproval: m.requiresApproval,
    });
  }

  for (const i of input.inspections) {
    items.push({
      id: `insp-${i.id}`,
      propertyAddress: i.propertyAddress,
      taskLabel: `${i.type} inspection`,
      status: i.status,
      href: inspectionDetail(i.id),
      module: 'Inspection',
      tone: ['Scheduled', 'Confirmed', 'In Progress'].includes(i.status)
        ? 'neutral'
        : 'ok',
    });
  }

  for (const r of input.rentReviews) {
    items.push({
      id: `rent-${r.id}`,
      propertyAddress: r.propertyAddress,
      taskLabel: 'Rent review',
      status: r.status,
      href: rentReviewDetail(r.id),
      module: 'Rent review',
      tone: r.requiresApproval ? 'warning' : 'ok',
      requiresApproval: r.requiresApproval,
    });
  }

  for (const v of input.vacating) {
    items.push({
      id: `vac-${v.id}`,
      propertyAddress: v.propertyAddress,
      taskLabel: 'Vacating',
      status: `${v.checklistProgress}% complete`,
      href: vacatingDetail(v.id),
      module: 'Vacating',
      tone: v.requiresApproval ? 'warning' : 'neutral',
      requiresApproval: v.requiresApproval,
    });
  }

  return items.sort((a, b) => a.propertyAddress.localeCompare(b.propertyAddress));
}
