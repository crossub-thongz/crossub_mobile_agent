import {
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  Receipt,
  Scale,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { PropertyJobKind } from '@/lib/property-job-rows';

/** Icon per job kind — used by Gii's per-property jobs card so each row reads at a glance. */
export const PROPERTY_JOB_KIND_ICON: Record<PropertyJobKind, LucideIcon> = {
  maintenance: Wrench,
  inspection: ClipboardCheck,
  rent_review: TrendingUp,
  leasing: FileSignature,
  end_leasing: DoorOpen,
  tribunal: Scale,
  accounting: Receipt,
};

/** Short human label per job kind. */
export const PROPERTY_JOB_KIND_LABEL: Record<PropertyJobKind, string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  rent_review: 'Rent review',
  leasing: 'Leasing',
  end_leasing: 'End of lease',
  tribunal: 'Tribunal',
  accounting: 'Accounting',
};
