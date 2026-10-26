import {
  GII_PAGE_LABEL_MAX_LENGTH,
  GII_PAGE_LABEL_SEPARATOR,
  GII_PAGE_NON_RECORD_SEGMENTS,
  GII_PAGE_ROUTES,
  type GiiPageModule,
  type GiiPageRoute,
  type GiiScreenRecordList,
} from '@/constants/gii-page-context';
import type {
  Inspection,
  LeasingCycle,
  MaintenanceRequest,
  MessageThread,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

export type GiiPageContext = {
  pageModule: GiiPageModule;
  pageLabel: string;
};

/** The agent data lists a record screen can be on — `useAgentData()` satisfies it. */
export type GiiScreenRecordLists = {
  maintenanceAll: readonly MaintenanceRequest[];
  inspections: readonly Inspection[];
  leasingCycles: readonly LeasingCycle[];
  tenantSelections: readonly TenantSelectionCase[];
  rentReviews: readonly RentReviewCase[];
  vacating: readonly VacatingCase[];
  tribunalCases: readonly TribunalCase[];
  messages: readonly MessageThread[];
};

/** The record open on screen, and the property it belongs to. */
export type GiiScreenRecord = {
  propertyId: string | null;
  propertyAddress: string | null;
  /** What the record is about (job title, thread subject), when it has one. */
  title: string | null;
  /** The reference the agent sees on screen (MR-00196, a tribunal case number), when it has one. */
  reference: string | null;
};

function matchRoute(pathname: string): { page: GiiPageRoute; rest: string[] } | null {
  for (const page of GII_PAGE_ROUTES) {
    if (pathname === page.route || pathname.startsWith(`${page.route}/`)) {
      const rest = pathname.slice(page.route.length).split('/').filter(Boolean);
      return { page, rest };
    }
  }
  return null;
}

/** Record ids are route segments, so they arrive URL encoded. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function findRecord(
  lists: GiiScreenRecordLists,
  list: GiiScreenRecordList,
  id: string,
): GiiScreenRecord | null {
  const rows: readonly { id: string; propertyId?: string; propertyAddress: string }[] = lists[list];
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const title =
    ('title' in row && typeof row.title === 'string' && row.title.trim()) ||
    ('subject' in row && typeof row.subject === 'string' && row.subject.trim()) ||
    null;
  const reference =
    ('trackingNumber' in row && typeof row.trackingNumber === 'string' && row.trackingNumber.trim()) ||
    ('caseNumber' in row && typeof row.caseNumber === 'string' && row.caseNumber.trim()) ||
    null;
  return {
    propertyId: row.propertyId || null,
    propertyAddress: row.propertyAddress?.trim() || null,
    title,
    reference,
  };
}

/**
 * The record open on screen (`/maintenance/[id]`), looked up in the agent's loaded data.
 * Null on a list screen, a form, a route with no record list, or a record not loaded.
 */
export function giiScreenRecordFor(
  pathname: string,
  lists: GiiScreenRecordLists,
): GiiScreenRecord | null {
  const match = matchRoute(pathname);
  if (!match?.page.recordList) return null;
  const [segment] = match.rest;
  if (!segment || GII_PAGE_NON_RECORD_SEGMENTS.has(segment)) return null;
  return findRecord(lists, match.page.recordList, decodeSegment(segment));
}

/**
 * The screen the agent is on, as Cros's `pageModule` and `pageLabel`. A record opened under
 * a module (`/maintenance/[id]`) reads as its detail label with its reference and title
 * ("Maintenance job MR-00196: Sink tap leaking"), so "this job" needs no lookup; the
 * property on screen, when there is one, is appended so the label alone names the subject.
 *
 * Null on a route Cros has no name for (auth, legal) — the turn then carries no screen.
 */
export function giiPageContextFor(args: {
  pathname: string;
  propertyLabel?: string | null;
  /** The open record's title, appended to the record screen's name. */
  recordTitle?: string | null;
  /** The open record's reference, put after the record screen's name. */
  recordReference?: string | null;
}): GiiPageContext | null {
  const match = matchRoute(args.pathname);
  if (!match) return null;
  const { page, rest } = match;
  const onRecord = rest.length > 0 && !GII_PAGE_NON_RECORD_SEGMENTS.has(rest[0]);
  const screen = onRecord ? (page.detailLabel ?? page.label) : page.label;
  const title = onRecord ? args.recordTitle?.trim() : null;
  const reference = onRecord ? args.recordReference?.trim() : null;
  const named = reference ? `${screen} ${reference}` : screen;
  const property = args.propertyLabel?.trim();
  const label = [title ? `${named}: ${title}` : named, property]
    .filter(Boolean)
    .join(GII_PAGE_LABEL_SEPARATOR);
  return { pageModule: page.module, pageLabel: label.slice(0, GII_PAGE_LABEL_MAX_LENGTH) };
}

/**
 * True when the property this turn is about differs from the one the previous turn was
 * about — the agent navigated mid-conversation. The server then treats earlier messages
 * as history rather than the subject. False on the first turn and when either side has
 * no property.
 */
export function giiPropertyChanged(
  previousPropertyId: string | null | undefined,
  currentPropertyId: string | null | undefined,
): boolean {
  return Boolean(previousPropertyId && currentPropertyId && previousPropertyId !== currentPropertyId);
}
