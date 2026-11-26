import { MAINTENANCE_ISSUE_TYPES } from '@/constants/maintenance-issue-types';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import type { MaintenanceRequest, MessageThread } from '@/lib/types';

/**
 * One email thread is one maintenance job.
 *
 * A later message on the same thread is unread on the job already logged. It is not another row.
 * A job that already has a quote, a tradie, a visit, or a decided responsibility stays on the list
 * so it can be combined or closed by hand.
 */

export const MAINTENANCE_REPLY_RULE =
  'A reply on an existing email thread is the same maintenance issue. Do not lodge another work order for it. Keep the reply on the job already logged. Open a separate job only when the message is a different fault and the agent asks to split it.';

const CLOSED_STATUS = new Set<string>([
  MAINTENANCE_STATUS.COMPLETED,
  MAINTENANCE_STATUS.CANCELLED,
  'completed',
  'closed',
  'deleted',
  'Deleted',
]);

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'it',
  'this',
  'that',
  'was',
  'are',
  'be',
  'at',
  'from',
  'my',
  'our',
  'please',
  'thanks',
  'thank',
  'you',
  'hi',
  'hello',
]);

type MailThread = Pick<MessageThread, 'id' | 'propertyId' | 'subject' | 'relatedCaseId' | 'unread'>;

export function isOpenMaintenanceJob(
  job: Pick<MaintenanceRequest, 'apiStatus' | 'status'>,
): boolean {
  if (job.apiStatus && CLOSED_STATUS.has(job.apiStatus)) return false;
  if (CLOSED_STATUS.has(job.status)) return false;
  return true;
}

/** `Re:` / `Fwd:` stripped, so a reply shares a key with the first email. */
export function normalizeMailSubject(subject: string): string {
  return subject.replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '').trim().toLowerCase();
}

export function isReplySubject(subject: string): boolean {
  return /^(?:re|fw|fwd)\s*:/i.test(subject.trim());
}

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function createdMs(job: MaintenanceRequest): number {
  const parsed = job.createdAt ? Date.parse(job.createdAt) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A quote, tradie, visit, or decided responsibility — left on the list for a manual combine. */
export function maintenanceJobHasCommitments(job: MaintenanceRequest): boolean {
  return (
    job.quoteAmount != null ||
    Boolean(job.contractorName) ||
    Boolean(job.scheduleProposal) ||
    job.requiresApproval ||
    job.priority === 'urgent' ||
    job.scheduleEscalated === true ||
    (job.responsibility != null && job.responsibility !== 'pending') ||
    (job.invitedContractorIds?.length ?? 0) > 0 ||
    (job.invitedContractors?.length ?? 0) > 0
  );
}

/**
 * Same issue type, and the descriptions share enough words to be one fault.
 * Two open "Blinds and Window Repair" jobs about different faults stay separate.
 */
export function sameMaintenanceIssue(
  a: Pick<MaintenanceRequest, 'title' | 'description'>,
  b: Pick<MaintenanceRequest, 'title' | 'description'>,
): boolean {
  const titleA = a.title.trim().toLowerCase();
  const titleB = b.title.trim().toLowerCase();
  if (!titleA || titleA !== titleB) return false;
  const wordsA = contentWords(a.description);
  const wordsB = new Set(contentWords(b.description));
  if (wordsA.length === 0 || wordsB.size === 0) return false;
  const seen = new Set<string>();
  let shared = 0;
  for (const word of wordsA) {
    if (seen.has(word) || !wordsB.has(word)) continue;
    seen.add(word);
    shared += 1;
  }
  return shared >= 2;
}

function threadKeyFromApi(job: MaintenanceRequest): string | null {
  const id = job.sourceThreadId?.trim();
  if (!id) return null;
  if (id.startsWith('thread:') || id.startsWith('mail:')) return id;
  return `thread:${id}`;
}

function mailKey(propertyId: string | undefined, subject: string): string | null {
  const normalized = normalizeMailSubject(subject);
  if (!propertyId || !normalized) return null;
  return `mail:${propertyId}:${normalized}`;
}

function applyThreadIdentity(
  jobs: readonly MaintenanceRequest[],
  threads: readonly MailThread[],
): MaintenanceRequest[] {
  const fromThreads = new Map<string, { key: string; unread: number }>();
  for (const thread of threads) {
    if (!thread.relatedCaseId) continue;
    const key = mailKey(thread.propertyId, thread.subject) ?? `thread:${thread.id}`;
    const prev = fromThreads.get(thread.relatedCaseId);
    fromThreads.set(thread.relatedCaseId, {
      key: prev?.key ?? key,
      unread: (prev?.unread ?? 0) + (thread.unread > 0 ? thread.unread : 0),
    });
  }

  return jobs.map((job) => {
    const linked = fromThreads.get(job.id);
    const sourceThreadId = threadKeyFromApi(job) ?? linked?.key;
    const threadUnread = linked?.unread ?? job.threadUnread ?? 0;
    if (!sourceThreadId && threadUnread === (job.threadUnread ?? 0)) return job;
    return {
      ...job,
      ...(sourceThreadId ? { sourceThreadId } : {}),
      ...(threadUnread > 0 ? { threadUnread } : {}),
    };
  });
}

function addUnread(into: Map<string, number>, jobId: string, count: number) {
  if (count <= 0) return;
  into.set(jobId, (into.get(jobId) ?? 0) + count);
}

/**
 * The list the agent sees. Jobs that are a later reply — same mail thread, or the same open
 * fault with nothing committed on the later job — are left off. Their unread is added to the
 * earlier job. Direct links still load a hidden job by id.
 */
export function listMaintenanceWithoutReplyDuplicates(
  jobs: readonly MaintenanceRequest[],
  threads: readonly MailThread[] = [],
): MaintenanceRequest[] {
  const keyed = applyThreadIdentity(jobs, threads);
  const omitted = new Set<string>();
  const extraUnread = new Map<string, number>();

  const byThread = new Map<string, MaintenanceRequest[]>();
  for (const job of keyed) {
    if (!job.sourceThreadId) continue;
    const group = byThread.get(job.sourceThreadId) ?? [];
    group.push(job);
    byThread.set(job.sourceThreadId, group);
  }
  for (const group of byThread.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort(
      (a, b) => createdMs(a) - createdMs(b) || a.id.localeCompare(b.id),
    );
    const keeper = ordered[0];
    for (const other of ordered.slice(1)) {
      if (!isOpenMaintenanceJob(other) || maintenanceJobHasCommitments(other)) continue;
      omitted.add(other.id);
      addUnread(extraUnread, keeper.id, other.threadUnread ?? 0);
    }
  }

  const openByProperty = new Map<string, MaintenanceRequest[]>();
  for (const job of keyed) {
    if (omitted.has(job.id) || !isOpenMaintenanceJob(job) || !job.propertyId) continue;
    const group = openByProperty.get(job.propertyId) ?? [];
    group.push(job);
    openByProperty.set(job.propertyId, group);
  }
  for (const group of openByProperty.values()) {
    const ordered = [...group].sort(
      (a, b) => createdMs(a) - createdMs(b) || a.id.localeCompare(b.id),
    );
    for (const job of ordered) {
      if (maintenanceJobHasCommitments(job) || omitted.has(job.id)) continue;
      const earlier = ordered.filter(
        (other) =>
          other.id !== job.id &&
          !omitted.has(other.id) &&
          isOpenMaintenanceJob(other) &&
          sameMaintenanceIssue(other, job) &&
          (createdMs(other) < createdMs(job) ||
            (createdMs(other) === createdMs(job) && other.id < job.id)),
      );
      if (earlier.length !== 1) continue;
      omitted.add(job.id);
      addUnread(extraUnread, earlier[0].id, job.threadUnread ?? 0);
    }
  }

  return keyed
    .filter((job) => !omitted.has(job.id))
    .map((job) => {
      const extra = extraUnread.get(job.id) ?? 0;
      if (extra <= 0) return job;
      return { ...job, threadUnread: (job.threadUnread ?? 0) + extra };
    });
}

function descriptionOverlaps(description: string, text: string): boolean {
  const words = contentWords(description);
  const hay = new Set(contentWords(text));
  if (words.length === 0 || hay.size === 0) return false;
  const seen = new Set<string>();
  let shared = 0;
  for (const word of words) {
    if (seen.has(word) || !hay.has(word)) continue;
    seen.add(word);
    shared += 1;
  }
  return shared >= 2;
}

function threadLooksLikeMaintenance(text: string): boolean {
  const hay = text.toLowerCase();
  if (
    MAINTENANCE_ISSUE_TYPES.some(
      (issue) => issue !== 'Others' && hay.includes(issue.toLowerCase()),
    )
  ) {
    return true;
  }
  return /\b(repair|leak|broken|maintenance|fault|damaged|mould|mold)\b/i.test(hay);
}

/**
 * The one open job a reply belongs on. A tracking number wins. Otherwise a reply matches one
 * open job of the same fault, or the only open maintenance job when the message is clearly
 * about maintenance. Several matches, or a first email that names no job, stay unlinked.
 */
export function matchReplyToOpenMaintenance(args: {
  propertyId: string;
  subject: string;
  text: string;
  jobs: readonly MaintenanceRequest[];
}): MaintenanceRequest | null {
  if (!args.propertyId) return null;
  const open = args.jobs.filter(
    (job) => job.propertyId === args.propertyId && isOpenMaintenanceJob(job),
  );
  if (open.length === 0) return null;

  const hay = `${args.subject}\n${args.text}`;
  const hayLower = hay.toLowerCase();
  const byRef = open.filter((job) => {
    const ref = job.trackingNumber.trim();
    return ref.length >= 4 && hayLower.includes(ref.toLowerCase());
  });
  if (byRef.length === 1) return byRef[0];
  if (byRef.length > 1) return null;

  const described = open.filter(
    (job) =>
      descriptionOverlaps(job.description, hay) &&
      (hayLower.includes(job.title.trim().toLowerCase()) || isReplySubject(args.subject)),
  );
  if (described.length === 1) return described[0];
  if (described.length > 1) return null;

  if (isReplySubject(args.subject) && threadLooksLikeMaintenance(hay) && open.length === 1) {
    return open[0];
  }
  return null;
}
