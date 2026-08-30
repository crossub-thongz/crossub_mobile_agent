import { ROUTES } from '@/constants/routes';
import type {
  Inspection,
  MaintenanceRequest,
  RentReviewCase,
  SectionStatus,
  VacatingCase,
} from '@/lib/types';

export function buildSectionStatus(input: {
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  vacating: VacatingCase[];
  maintenanceOverdue?: number;
}): SectionStatus[] {
  const maintApproval = input.maintenance.filter((m) => m.requiresApproval).length;
  const maintActive = input.maintenance.filter(
    (m) => !['Closed', 'closed'].includes(m.status),
  ).length;
  const inspActive = input.inspections.filter((i) =>
    ['Scheduled', 'Confirmed', 'In Progress'].includes(i.status),
  ).length;
  const rentAction = input.rentReviews.filter((r) => r.requiresApproval).length;
  const vacAction = input.vacating.filter((v) => v.requiresApproval).length;

  let maintLabel = 'All up to date';
  let maintTone: SectionStatus['tone'] = 'ok';
  if (input.maintenanceOverdue && input.maintenanceOverdue > 0) {
    maintLabel = `${input.maintenanceOverdue} overdue`;
    maintTone = 'urgent';
  } else if (maintApproval > 0) {
    maintLabel = `${maintApproval} need your approval`;
    maintTone = 'warning';
  } else if (maintActive > 0) {
    maintLabel = `${maintActive} in progress`;
    maintTone = 'neutral';
  }

  return [
    {
      id: 'maintenance',
      label: 'Maintenance',
      href: `${ROUTES.TASKS}?filter=Maintenance`,
      statusLabel: maintLabel,
      tone: maintTone,
      count: maintApproval || input.maintenanceOverdue || undefined,
    },
    {
      id: 'inspections',
      label: 'Inspections',
      href: `${ROUTES.TASKS}?filter=Inspection`,
      statusLabel:
        inspActive > 0 ? `${inspActive} scheduled` : 'Nothing scheduled',
      tone: inspActive > 0 ? 'neutral' : 'ok',
      count: inspActive || undefined,
    },
    {
      id: 'rent_review',
      label: 'Rent review',
      href: ROUTES.RENT_REVIEW,
      statusLabel:
        rentAction > 0 ? `${rentAction} awaiting confirmation` : 'Up to date',
      tone: rentAction > 0 ? 'warning' : 'ok',
      count: rentAction || undefined,
    },
    {
      id: 'vacating',
      label: 'End leasing',
      href: ROUTES.VACATING,
      statusLabel:
        vacAction > 0 ? `${vacAction} need approval` : 'No active move-outs',
      tone: vacAction > 0 ? 'warning' : 'ok',
      count: vacAction || undefined,
    },
  ];
}
