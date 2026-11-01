"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import type { Agency } from "@/lib/types";
import {
  taskAssignee,
  taskAssigneeInitials,
  taskDueMeta,
  taskReference,
  taskServiceLabel,
  taskSubtypeLabel,
  type TaskListV2Row,
} from "@/lib/task-list-v2";
import { cn } from "@/lib/utils";

import { TaskIcon } from "@/components/agent/tasks/task-list-v2-table";

export function TaskListBoardTable({
  rows,
  agencies,
}: {
  rows: TaskListV2Row[];
  agencies: Agency[];
}) {
  const router = useRouter();

  return (
    <div className="v2-dashboard__card min-w-0 overflow-hidden">
      {/* A phone gets a card per task: the table's columns sat behind a sideways swipe. */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => {
          const due = taskDueMeta(row);
          const reference = taskReference(row);
          return (
            <li key={row.id}>
              <Link
                href={row.href}
                className="hover:bg-muted/30 flex gap-2.5 px-3 py-3"
              >
                <TaskIcon row={row} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {row.task.title}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[row.property.address, row.property.suburb]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={statusPillClass(row)}>
                      {row.statusLabel}
                    </span>
                    <span className={dueClass(due.tone)}>{due.primary}</span>
                    {reference ? (
                      <span className="text-muted-foreground text-[11px]">
                        {reference}
                      </span>
                    ) : null}
                  </div>
                  {row.statusSublabel ? (
                    <p className="text-muted-foreground mt-1 truncate text-[12px]">
                      {row.statusSublabel}
                    </p>
                  ) : null}
                </div>
                <span className={cn(actionClass(row), "self-center")}>
                  {row.needsReview ? "Review" : "View"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-[12px] font-semibold tracking-wide">
              <th className="px-3 py-3">Task</th>
              <th className="px-3 py-3">Property</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Due date</th>
              <th className="px-3 py-3">Assigned to</th>
              <th className="px-3 py-3">Service</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const due = taskDueMeta(row);
              const assignee = taskAssignee(row);
              const initials = taskAssigneeInitials(assignee);
              const reference = taskReference(row);
              const service = taskServiceLabel(row, agencies);
              return (
                <tr
                  key={row.id}
                  onClick={() => router.push(row.href)}
                  className="hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-3 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TaskIcon row={row} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {row.task.title}
                        </p>
                        {reference ? (
                          <p className="text-muted-foreground truncate text-xs">
                            {reference}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className="cursor-pointer truncate font-medium">
                      {row.property.address}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {[
                        row.property.suburb,
                        row.property.state,
                        row.property.postcode,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className="font-medium">{row.typeLabel}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {taskSubtypeLabel(row)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className={statusPillClass(row)}>
                      {row.statusLabel}
                    </span>
                    {row.statusSublabel ? (
                      <p className="text-muted-foreground mt-1 max-w-[12rem] truncate text-[12px]">
                        {row.statusSublabel}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <p className={dueClass(due.tone)}>{due.primary}</p>
                    {due.secondary ? (
                      <p className="text-muted-foreground text-[12px]">
                        {due.secondary}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          initials
                            ? "bg-primary/12 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {initials || "—"}
                      </span>
                      <span className="truncate text-xs font-medium">
                        {assignee}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        service === "Self-Manage" && "text-sky-700",
                        service === "Inspection Only" && "text-violet-700",
                      )}
                    >
                      {service}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={row.href} className={actionClass(row)}>
                        {row.needsReview ? "Review" : "View"}
                      </Link>
                      <Link
                        href={row.href}
                        className="text-muted-foreground hover:bg-muted flex size-8 items-center justify-center rounded-full"
                        aria-label={`Open ${row.task.title}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusPillClass(row: TaskListV2Row): string {
  return cn(
    "inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold",
    row.statusTone === "action" && "bg-rose-500/12 text-rose-700",
    row.statusTone === "handling" && "bg-emerald-500/12 text-emerald-700",
    row.statusTone === "waiting" && "bg-amber-500/15 text-amber-800",
    (row.statusTone === "completed" || row.statusTone === "muted") &&
      "bg-muted text-muted-foreground",
  );
}

function dueClass(tone: ReturnType<typeof taskDueMeta>["tone"]): string {
  return cn(
    "text-xs font-semibold",
    tone === "overdue" && "text-rose-600",
    tone === "soon" && "text-amber-700",
    tone === "muted" && "text-muted-foreground",
  );
}

function actionClass(row: TaskListV2Row): string {
  return cn(
    "inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
    row.needsReview
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "hover:bg-muted border",
  );
}
