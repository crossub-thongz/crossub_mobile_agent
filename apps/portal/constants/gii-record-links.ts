import {
  Bell,
  ClipboardCheck,
  DoorOpen,
  FileSignature,
  Home,
  MessagesSquare,
  Receipt,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { GiiJobCaseLink } from '@/lib/crossub-api/gii-client';

export type GiiRecordLinkKind = GiiJobCaseLink['kind'];

/**
 * What a Cros Open button opens (Jarvis 1.1). Jobs, reviews, inspections, leasing, End
 * Leasing and arrears open the portfolio case dialog; the rest go to their own screen.
 */
export const GII_RECORD_LINK_KIND = {
  MAINTENANCE: 'maintenance',
  RENT_REVIEW: 'rent_review',
  INSPECTION: 'inspection',
  LEASING: 'leasing',
  END_LEASING: 'end_leasing',
  CONVERSATION: 'conversation',
  NOTIFICATION: 'notification',
  PROPERTY: 'property',
  ARREARS: 'arrears',
} as const satisfies Record<string, GiiRecordLinkKind>;

export const GII_RECORD_LINK_ICON: Record<GiiRecordLinkKind, LucideIcon> = {
  maintenance: Wrench,
  rent_review: TrendingUp,
  inspection: ClipboardCheck,
  leasing: FileSignature,
  end_leasing: DoorOpen,
  conversation: MessagesSquare,
  notification: Bell,
  property: Home,
  arrears: Receipt,
};

export const GII_RECORD_LINK_LABEL: Record<GiiRecordLinkKind, string> = {
  maintenance: 'Maintenance',
  rent_review: 'Rent review',
  inspection: 'Inspection',
  leasing: 'Leasing',
  end_leasing: 'End of lease',
  conversation: 'Conversation',
  notification: 'Notification',
  property: 'Property',
  arrears: 'Arrears',
};
