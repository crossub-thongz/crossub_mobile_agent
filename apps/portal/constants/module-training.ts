import type { Agency } from '@/lib/types';
import { LEASING_PAGE_VIEW, type LeasingPageView } from '@/constants/module-workspace';
import { ROUTES } from '@/constants/routes';
import {
  hasSelfManagedAgency,
  hasSelfManagedTrustAccess,
  isInspectionOnlyAgent,
  PORTAL_SERVICE_LEVEL,
  resolvePortalServiceLevel,
} from '@/lib/portal-service-level';

export const LEASING_VIEW_EVENT = 'crossub:leasing-view';

/** Tell the sidebar and the first-visit player which Leasing list is open. */
export function notifyLeasingView(view: LeasingPageView): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LEASING_VIEW_EVENT, { detail: view }));
}

export type TrainingVideo = {
  id: string;
  title: string;
  src: string;
  /** Label in a replay menu, when it should match the screen rather than the file name. */
  menuLabel?: string;
};

export const TRAINING_VIDEO = {
  INTRODUCTION: 'introduction',
  MAINTENANCE: 'maintenance',
  NEW_LEASING: 'new-leasing',
  VACATING: 'vacating',
  TENANCY_REVIEW: 'tenancy-review',
  INSPECTION: 'inspection',
  ACCOUNTING: 'accounting',
  EMAIL: 'email',
  CONTACT_US: 'contact-us',
  FULL_SERVICE: 'full-service',
  CROSSUB_TEAM: 'crossub-team',
} as const;

export type TrainingVideoId = (typeof TRAINING_VIDEO)[keyof typeof TRAINING_VIDEO];

export const TRAINING_VIDEOS: readonly TrainingVideo[] = [
  { id: TRAINING_VIDEO.INTRODUCTION, title: 'Introduction', src: '/training/introduction.mp4' },
  { id: TRAINING_VIDEO.MAINTENANCE, title: 'Maintenance', src: '/training/maintenance.mp4' },
  {
    id: TRAINING_VIDEO.NEW_LEASING,
    title: 'New leasing',
    menuLabel: 'Lettings',
    src: '/training/new-leasing.mp4',
  },
  {
    id: TRAINING_VIDEO.VACATING,
    title: 'Vacating',
    menuLabel: 'Vacating',
    src: '/training/vacating.mp4',
  },
  {
    id: TRAINING_VIDEO.TENANCY_REVIEW,
    title: 'Tenancy review',
    menuLabel: 'Tenancy reviews',
    src: '/training/tenancy-review.mp4',
  },
  { id: TRAINING_VIDEO.INSPECTION, title: 'Inspection', src: '/training/inspection.mp4' },
  { id: TRAINING_VIDEO.ACCOUNTING, title: 'Accounting', src: '/training/accounting.mp4' },
  { id: TRAINING_VIDEO.EMAIL, title: 'Email', src: '/training/email.mp4' },
  { id: TRAINING_VIDEO.CONTACT_US, title: 'Contact us', src: '/training/contact-us.mp4' },
  { id: TRAINING_VIDEO.FULL_SERVICE, title: 'Full Service', src: '/training/full-service.mp4' },
  { id: TRAINING_VIDEO.CROSSUB_TEAM, title: 'CROSSUB team', src: '/training/crossub-team.mp4' },
];

export function trainingVideoById(id: string): TrainingVideo | undefined {
  return TRAINING_VIDEOS.find((video) => video.id === id);
}

export type TrainingAudience = {
  selfManaged: boolean;
  inspectionOnly: boolean;
  fullService: boolean;
  trust: boolean;
};

export function trainingAudience(agencies: Agency[]): TrainingAudience {
  return {
    selfManaged: hasSelfManagedAgency(agencies),
    inspectionOnly: isInspectionOnlyAgent(agencies),
    fullService: agencies.some((agency) => {
      const level = resolvePortalServiceLevel(agency.portalServiceLevel);
      return (
        level === PORTAL_SERVICE_LEVEL.FULL_MANAGEMENT || level === PORTAL_SERVICE_LEVEL.LEGACY
      );
    }),
    trust: hasSelfManagedTrustAccess(agencies),
  };
}

/** Sidebar rows that offer a replay button for this login. */
export function replayVideosForHref(href: string, audience: TrainingAudience): TrainingVideo[] {
  const ids: TrainingVideoId[] = [];
  if (href === ROUTES.DASHBOARD) {
    ids.push(TRAINING_VIDEO.INTRODUCTION);
    if (audience.fullService) ids.push(TRAINING_VIDEO.FULL_SERVICE);
  } else if (href === ROUTES.TASKS && audience.inspectionOnly) {
    ids.push(TRAINING_VIDEO.INSPECTION);
  } else if (href === ROUTES.MAINTENANCE && audience.selfManaged) {
    ids.push(TRAINING_VIDEO.MAINTENANCE);
  } else if (href === ROUTES.LEASING && audience.selfManaged) {
    ids.push(TRAINING_VIDEO.NEW_LEASING, TRAINING_VIDEO.TENANCY_REVIEW, TRAINING_VIDEO.VACATING);
  } else if (href === ROUTES.INSPECTIONS && (audience.selfManaged || audience.inspectionOnly)) {
    ids.push(TRAINING_VIDEO.INSPECTION);
  } else if (href === ROUTES.TRUST && audience.trust) {
    ids.push(TRAINING_VIDEO.ACCOUNTING);
  } else if (href === ROUTES.CONVERSATIONS && audience.selfManaged) {
    ids.push(TRAINING_VIDEO.EMAIL);
  }
  return ids.flatMap((id) => {
    const video = trainingVideoById(id);
    return video ? [video] : [];
  });
}

export function leasingViewHref(view: LeasingPageView): string {
  if (view === LEASING_PAGE_VIEW.LETTINGS) return ROUTES.LEASING;
  return `${ROUTES.LEASING}?view=${view}`;
}

/**
 * The module video that plays the first time this user opens the page.
 * Introduction is the existing first-login welcome, so it is not repeated here.
 */
export function autoplayTrainingId(
  pathname: string,
  leasingView: string | null,
  audience: TrainingAudience,
): TrainingVideoId | null {
  if (pathname === ROUTES.DASHBOARD && audience.fullService) return TRAINING_VIDEO.FULL_SERVICE;
  if (pathname === ROUTES.MAINTENANCE && audience.selfManaged) return TRAINING_VIDEO.MAINTENANCE;
  if (pathname === ROUTES.LEASING && audience.selfManaged) {
    if (leasingView === LEASING_PAGE_VIEW.VACATING) return TRAINING_VIDEO.VACATING;
    if (leasingView === LEASING_PAGE_VIEW.TENANCY_REVIEWS) return TRAINING_VIDEO.TENANCY_REVIEW;
    return TRAINING_VIDEO.NEW_LEASING;
  }
  if ((pathname === ROUTES.RENT_REVIEW || pathname.startsWith(`${ROUTES.RENT_REVIEW}/`)) && audience.selfManaged) {
    return TRAINING_VIDEO.TENANCY_REVIEW;
  }
  if ((pathname === ROUTES.VACATING || pathname.startsWith(`${ROUTES.VACATING}/`)) && audience.selfManaged) {
    return TRAINING_VIDEO.VACATING;
  }
  if (
    (pathname === ROUTES.INSPECTIONS || pathname.startsWith(`${ROUTES.INSPECTIONS}/`)) &&
    (audience.selfManaged || audience.inspectionOnly)
  ) {
    return TRAINING_VIDEO.INSPECTION;
  }
  if (pathname === ROUTES.TASKS && audience.inspectionOnly) return TRAINING_VIDEO.INSPECTION;
  if ((pathname === ROUTES.TRUST || pathname.startsWith(`${ROUTES.TRUST}/`)) && audience.trust) {
    return TRAINING_VIDEO.ACCOUNTING;
  }
  if (pathname === ROUTES.CONVERSATIONS || pathname.startsWith(`${ROUTES.CONVERSATIONS}/`)) {
    if (audience.selfManaged) return TRAINING_VIDEO.EMAIL;
  }
  if (pathname === ROUTES.SUPPORT_CONTACT || pathname.startsWith(`${ROUTES.SUPPORT_CONTACT}/`)) {
    return TRAINING_VIDEO.CONTACT_US;
  }
  if (pathname === ROUTES.SUPPORT) return TRAINING_VIDEO.CROSSUB_TEAM;
  return null;
}
