/**
 * Inspection Records module — read-only registry of migrated historical
 * inspections (apps/api `GET /api/inspections`). Enum values mirror the backend
 * Prisma `InspectionType` / `InspectionStatus` and are passed through unchanged.
 * Accent = emerald/mint (the inspection domain hue).
 */

export const INSPECTION_RECORDS_ROUTE = {
  OVERVIEW: "/inspection-records",
} as const

export const INSPECTION_RECORDS_PAGE_SIZE = 25

export const INSPECTION_RECORDS_ACCENT = {
  iconChip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  buttonSolid: "bg-emerald-600 text-white hover:bg-emerald-500",
  text: "text-emerald-700 dark:text-emerald-300",
  ring: "ring-emerald-500/30",
} as const

/* ------------------------------- type ------------------------------------- */

export const INSPECTION_RECORD_TYPE = {
  CONDITION: "CONDITION",
  ROUTINE: "ROUTINE",
  INGOING: "INGOING",
  OUTGOING: "OUTGOING",
  WARD_ROUND: "WARD_ROUND",
  OPEN: "OPEN",
} as const

export type InspectionRecordType =
  (typeof INSPECTION_RECORD_TYPE)[keyof typeof INSPECTION_RECORD_TYPE]

export const INSPECTION_RECORD_TYPE_LABEL: Record<InspectionRecordType, string> = {
  CONDITION: "Condition",
  ROUTINE: "Routine",
  INGOING: "Ingoing",
  OUTGOING: "Outgoing",
  WARD_ROUND: "Ward Round",
  OPEN: "Open",
}

export const INSPECTION_RECORD_TYPE_ORDER: InspectionRecordType[] = [
  INSPECTION_RECORD_TYPE.ROUTINE,
  INSPECTION_RECORD_TYPE.WARD_ROUND,
  INSPECTION_RECORD_TYPE.INGOING,
  INSPECTION_RECORD_TYPE.OUTGOING,
  INSPECTION_RECORD_TYPE.CONDITION,
  INSPECTION_RECORD_TYPE.OPEN,
]

/* ------------------------------ status ------------------------------------ */

export const INSPECTION_RECORD_STATUS = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  FIRST_REVIEW: "FIRST_REVIEW",
  SECOND_REVIEW: "SECOND_REVIEW",
  COMPLETED: "COMPLETED",
  PUBLISHED: "PUBLISHED",
  CANCELLED: "CANCELLED",
} as const

export type InspectionRecordStatus =
  (typeof INSPECTION_RECORD_STATUS)[keyof typeof INSPECTION_RECORD_STATUS]

export const INSPECTION_RECORD_STATUS_LABEL: Record<InspectionRecordStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  FIRST_REVIEW: "First Review",
  SECOND_REVIEW: "Second Review",
  COMPLETED: "Completed",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
}

export const INSPECTION_RECORD_STATUS_ORDER: InspectionRecordStatus[] = [
  INSPECTION_RECORD_STATUS.COMPLETED,
  INSPECTION_RECORD_STATUS.PUBLISHED,
  INSPECTION_RECORD_STATUS.IN_PROGRESS,
  INSPECTION_RECORD_STATUS.FIRST_REVIEW,
  INSPECTION_RECORD_STATUS.SECOND_REVIEW,
  INSPECTION_RECORD_STATUS.DRAFT,
  INSPECTION_RECORD_STATUS.CANCELLED,
]

export const INSPECTION_RECORD_STATUS_TONE: Record<InspectionRecordStatus, string> = {
  COMPLETED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  PUBLISHED: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  IN_PROGRESS: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  FIRST_REVIEW: "border-violet-500/40 bg-violet-500/15 text-violet-100",
  SECOND_REVIEW: "border-violet-500/40 bg-violet-500/15 text-violet-100",
  DRAFT: "border-border bg-secondary/40 text-muted-foreground",
  CANCELLED: "border-rose-500/40 bg-rose-500/15 text-rose-200",
}
