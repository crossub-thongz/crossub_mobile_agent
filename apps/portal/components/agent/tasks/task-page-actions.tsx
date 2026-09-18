'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { TaskForceActionDialog } from '@/components/agent/tasks/task-force-action-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { messageDetail, propertyDetail, ROUTES } from '@/constants/routes';
import {
  forceCompleteAgentTask,
  forceDeleteAgentTask,
  type AgentTaskKind,
} from '@/lib/crossub-api/agent-workflow-client';

const actionsButtonClass =
  'inline-flex items-center gap-1 rounded-xl border v2-frosted-surface px-3 py-2 text-sm font-semibold';
const itemClass =
  'hover:bg-muted/60 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';

export function TaskPageActions({
  propertyId,
  reference,
  taskKind,
  taskId,
  completed = false,
  deleted = false,
  onMutated,
}: {
  propertyId?: string | null;
  reference?: string;
  taskKind: AgentTaskKind;
  taskId: string;
  completed?: boolean;
  deleted?: boolean;
  onMutated?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'delete' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { ensureMessageThread, properties, refresh } = useAgentData();
  const hasProperty = Boolean(propertyId);
  const property = propertyId ? properties.find((row) => row.id === propertyId) : undefined;
  const tenantName = property?.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim() ?? '';
  const canMessageTenant = Boolean(property) && tenantName.toLowerCase() !== 'vacant';
  const canForceComplete = !completed && !deleted;
  const canForceDelete = !deleted;

  const close = () => setOpen(false);

  const runAction = async (action: 'complete' | 'delete') => {
    setSubmitting(true);
    try {
      if (action === 'complete') {
        await forceCompleteAgentTask(taskKind, taskId);
        toast.success('Task marked as completed');
        setConfirmAction(null);
        await refresh({ force: true });
        await onMutated?.();
        return;
      }
      await forceDeleteAgentTask(taskKind, taskId);
      toast.success('Task deleted');
      setConfirmAction(null);
      await refresh({ force: true });
      await onMutated?.();
      router.push(ROUTES.TASKS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update this task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={actionsButtonClass} aria-label="Actions">
            Actions
            <ChevronDown className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          {hasProperty ? (
            <>
              <Link href={propertyDetail(propertyId!)} className={itemClass} onClick={close}>
                View property
              </Link>
              {canMessageTenant ? (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    const threadId = ensureMessageThread(propertyId!);
                    close();
                    router.push(messageDetail(threadId));
                  }}
                >
                  Message tenant
                </button>
              ) : null}
            </>
          ) : null}
          {reference ? (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                void navigator.clipboard.writeText(reference);
                toast.success('Reference copied');
                close();
              }}
            >
              Copy reference
            </button>
          ) : null}
          {canForceComplete || canForceDelete ? (
            <div className="border-border/60 mt-1 border-t pt-1">
              {canForceComplete ? (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    close();
                    setConfirmAction('complete');
                  }}
                >
                  Mark as completed
                </button>
              ) : null}
              {canForceDelete ? (
                <button
                  type="button"
                  className={`${itemClass} text-destructive`}
                  onClick={() => {
                    close();
                    setConfirmAction('delete');
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
          {!hasProperty && !reference && !canForceComplete && !canForceDelete ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">No actions available</p>
          ) : null}
        </PopoverContent>
      </Popover>
      <TaskForceActionDialog
        open={confirmAction != null}
        onOpenChange={(next) => {
          if (!next) setConfirmAction(null);
        }}
        action={confirmAction}
        submitting={submitting}
        onConfirm={() => {
          if (confirmAction) void runAction(confirmAction);
        }}
      />
    </div>
  );
}