'use client';

import { ChevronRight, X } from 'lucide-react';
import { Fragment, useState } from 'react';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustTransactionDialog } from '@/components/agent/trust/trust-transaction-dialog';
import {
  TRUST_TABLE_CELL_CLASS,
  TRUST_TABLE_HEAD_CLASS,
  TrustLoadError,
  TrustLoading,
  TrustPanel,
} from '@/components/agent/trust/trust-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_AUDIT_ACTION_LABEL,
  TRUST_AUDIT_ACTION_ORDER,
  TRUST_AUDIT_COPY as COPY,
  TRUST_AUDIT_ENTITY,
  TRUST_AUDIT_ENTITY_ID_SHORT,
  TRUST_AUDIT_ENTITY_LABEL,
  TRUST_AUDIT_ENTITY_ORDER,
  TRUST_AUDIT_FILTER_ALL,
  TRUST_AUDIT_PAGE_SIZE,
  type TrustAuditAction,
  type TrustAuditEntityType,
} from '@/constants/trust-settings';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustAuditActors,
  fetchTrustAuditEvents,
  type TrustAuditEvent,
} from '@/lib/crossub-api/agent-trust-settings-client';
import { formatPropertyDateTime } from '@/lib/format-datetime';
import { trustTodayKey } from '@/lib/trust-accounting';
import { cn } from '@/lib/utils';
import {
  auditChangeSummary,
  auditPageCount,
  formatAuditJson,
  isAuditDateRangeValid,
  isTrustAuditAction,
  isTrustAuditEntityType,
} from '@/utils/trust-audit';

type AuditFilters = {
  action: TrustAuditAction | typeof TRUST_AUDIT_FILTER_ALL;
  entityType: TrustAuditEntityType | typeof TRUST_AUDIT_FILTER_ALL;
  actorUserId: string;
  from: string;
  to: string;
};

const NO_FILTERS: AuditFilters = {
  action: TRUST_AUDIT_FILTER_ALL,
  entityType: TRUST_AUDIT_FILTER_ALL,
  actorUserId: TRUST_AUDIT_FILTER_ALL,
  from: '',
  to: '',
};

function isFiltered(filters: AuditFilters): boolean {
  return (
    filters.action !== TRUST_AUDIT_FILTER_ALL ||
    filters.entityType !== TRUST_AUDIT_FILTER_ALL ||
    filters.actorUserId !== TRUST_AUDIT_FILTER_ALL ||
    filters.from !== '' ||
    filters.to !== ''
  );
}

/**
 * Audit log (D80, D135): every trust accounting change in the agency's own workspace, newest
 * first: when, who, the action, the entity and what changed. A row opens to its before and after
 * values; a transaction opens its dialog. The API always reads the agency's own workspace.
 */
export function TrustAuditLogPanel({ agencyId }: { agencyId: string }) {
  const [filters, setFilters] = useState<AuditFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null);
  const rangeValid = isAuditDateRangeValid(filters);

  const actors = useTrustResource(agencyId, () => fetchTrustAuditActors(agencyId));
  const events = useTrustResource(
    rangeValid
      ? `${agencyId}:${filters.action}:${filters.entityType}:${filters.actorUserId}:${filters.from}:${filters.to}:${page}`
      : null,
    () =>
      fetchTrustAuditEvents(agencyId, {
        page,
        pageSize: TRUST_AUDIT_PAGE_SIZE,
        action: filters.action === TRUST_AUDIT_FILTER_ALL ? undefined : filters.action,
        entityType: filters.entityType === TRUST_AUDIT_FILTER_ALL ? undefined : filters.entityType,
        actorUserId: filters.actorUserId === TRUST_AUDIT_FILTER_ALL ? undefined : filters.actorUserId,
        from: filters.from || undefined,
        to: filters.to || undefined,
      }),
  );

  const update = (patch: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <TrustPanel title={COPY.title}>
      <p className="text-muted-foreground mb-4 text-sm">{COPY.subtitle}</p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <select
          aria-label={COPY.action}
          className={cn(SELECT_CLASS, 'w-48')}
          value={filters.action}
          onChange={(e) => update({ action: isTrustAuditAction(e.target.value) ? e.target.value : TRUST_AUDIT_FILTER_ALL })}
        >
          <option value={TRUST_AUDIT_FILTER_ALL}>{COPY.allActions}</option>
          {TRUST_AUDIT_ACTION_ORDER.map((action) => (
            <option key={action} value={action}>
              {TRUST_AUDIT_ACTION_LABEL[action]}
            </option>
          ))}
        </select>
        <select
          aria-label={COPY.entity}
          className={cn(SELECT_CLASS, 'w-44')}
          value={filters.entityType}
          onChange={(e) =>
            update({ entityType: isTrustAuditEntityType(e.target.value) ? e.target.value : TRUST_AUDIT_FILTER_ALL })
          }
        >
          <option value={TRUST_AUDIT_FILTER_ALL}>{COPY.allEntities}</option>
          {TRUST_AUDIT_ENTITY_ORDER.map((entity) => (
            <option key={entity} value={entity}>
              {TRUST_AUDIT_ENTITY_LABEL[entity]}
            </option>
          ))}
        </select>
        <select
          aria-label={COPY.who}
          className={cn(SELECT_CLASS, 'w-44')}
          value={filters.actorUserId}
          onChange={(e) => update({ actorUserId: e.target.value })}
        >
          <option value={TRUST_AUDIT_FILTER_ALL}>{COPY.everyone}</option>
          {(actors.data?.actors ?? []).map((actor) => (
            <option key={actor.userId} value={actor.userId}>
              {actor.name}
            </option>
          ))}
        </select>
        <div className="space-y-1">
          <Label htmlFor="trust-audit-from" className="text-xs">
            {COPY.from}
          </Label>
          <Input
            id="trust-audit-from"
            type="date"
            className="h-9 w-40"
            value={filters.from}
            max={filters.to || trustTodayKey()}
            onChange={(e) => update({ from: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="trust-audit-to" className="text-xs">
            {COPY.to}
          </Label>
          <Input
            id="trust-audit-to"
            type="date"
            className="h-9 w-40"
            value={filters.to}
            min={filters.from || undefined}
            max={trustTodayKey()}
            onChange={(e) => update({ to: e.target.value })}
          />
        </div>
        {isFiltered(filters) ? (
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => update(NO_FILTERS)}>
            <X className="size-3.5" />
            {COPY.clear}
          </Button>
        ) : null}
        {!rangeValid ? <p className="text-destructive basis-full text-xs">{COPY.rangeInvalid}</p> : null}
      </div>

      {!rangeValid ? null : !events.data ? (
        events.error ? (
          <TrustLoadError error={events.error} onRetry={events.reload} />
        ) : (
          <TrustLoading />
        )
      ) : events.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center">
          <p className="text-sm font-medium">{COPY.emptyTitle}</p>
          <p className="text-muted-foreground mt-1 text-xs">{COPY.empty}</p>
        </div>
      ) : (
        <AuditTable
          events={events.data.items}
          loading={events.loading}
          onOpenTransaction={setOpenTransactionId}
        />
      )}

      {events.data && events.data.total > TRUST_AUDIT_PAGE_SIZE ? (
        <AuditPager
          page={page}
          pages={auditPageCount(events.data.total, TRUST_AUDIT_PAGE_SIZE)}
          disabled={events.loading}
          onPage={setPage}
        />
      ) : null}

      {openTransactionId ? (
        <TrustTransactionDialog
          key={openTransactionId}
          agencyId={agencyId}
          transactionId={openTransactionId}
          onClose={() => setOpenTransactionId(null)}
          onReversed={events.reload}
        />
      ) : null}
    </TrustPanel>
  );
}

function AuditTable({
  events,
  loading,
  onOpenTransaction,
}: {
  events: readonly TrustAuditEvent[];
  loading: boolean;
  onOpenTransaction: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn('-mx-4 overflow-x-auto border-y', loading && 'opacity-60')}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="border-b">
          <tr>
            <th className={cn(TRUST_TABLE_HEAD_CLASS, 'w-8')} />
            <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.when}</th>
            <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.who}</th>
            <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.action}</th>
            <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.entity}</th>
            <th className={TRUST_TABLE_HEAD_CLASS}>{COPY.summary}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const open = expanded.has(event.id);
            return (
              <Fragment key={event.id}>
                <tr
                  className={cn('hover:bg-muted/40 cursor-pointer border-b last:border-b-0', open && 'bg-muted/40')}
                  onClick={() => toggle(event.id)}
                >
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'w-8')}>
                    <ChevronRight
                      className={cn('text-muted-foreground size-3.5 transition-transform', open && 'rotate-90')}
                    />
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'whitespace-nowrap tabular-nums')}>
                    {formatPropertyDateTime(event.createdAt)}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'max-w-[160px] truncate')}>
                    {event.actorName ?? COPY.system}
                  </td>
                  <td className={TRUST_TABLE_CELL_CLASS}>
                    {isTrustAuditAction(event.action) ? TRUST_AUDIT_ACTION_LABEL[event.action] : event.action}
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'max-w-[220px]')} onClick={(e) => e.stopPropagation()}>
                    <EntityCell event={event} onOpenTransaction={onOpenTransaction} />
                  </td>
                  <td className={cn(TRUST_TABLE_CELL_CLASS, 'text-muted-foreground max-w-[260px] truncate')}>
                    {auditChangeSummary(event.before, event.after)}
                  </td>
                </tr>
                {open ? (
                  <tr className="bg-muted/20 border-b">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <JsonPane title={COPY.before} value={event.before} />
                        <JsonPane title={COPY.after} value={event.after} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The entity's kind and label (or the start of its id); a transaction opens its dialog. */
function EntityCell({
  event,
  onOpenTransaction,
}: {
  event: TrustAuditEvent;
  onOpenTransaction: (id: string) => void;
}) {
  const kindLabel = isTrustAuditEntityType(event.entityType)
    ? TRUST_AUDIT_ENTITY_LABEL[event.entityType]
    : event.entityType;
  const name = event.entityLabel ?? event.entityId.slice(0, TRUST_AUDIT_ENTITY_ID_SHORT);
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground block text-[11px]">{kindLabel}</span>
      {event.entityType === TRUST_AUDIT_ENTITY.TRANSACTION ? (
        <button
          type="button"
          className="text-primary block max-w-full truncate text-left underline-offset-2 hover:underline"
          title={event.entityId}
          onClick={() => onOpenTransaction(event.entityId)}
        >
          {name}
        </button>
      ) : (
        <span className="block truncate" title={event.entityId}>
          {name}
        </span>
      )}
    </div>
  );
}

function JsonPane({ title, value }: { title: string; value: Record<string, unknown> | null | undefined }) {
  const text = formatAuditJson(value);
  return (
    <div className="bg-card min-w-0 rounded-lg border">
      <p className="text-muted-foreground border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </p>
      {text ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-sans text-[11px] tabular-nums">
          {text}
        </pre>
      ) : (
        <p className="text-muted-foreground px-3 py-2 text-xs">{COPY.nothing}</p>
      )}
    </div>
  );
}

function AuditPager({
  page,
  pages,
  disabled,
  onPage,
}: {
  page: number;
  pages: number;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">{COPY.page(page, pages)}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
          {COPY.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          {COPY.next}
        </Button>
      </div>
    </div>
  );
}
