/** Inner green glow for newly arrived workflow cases (until opened). */
export const WORKFLOW_CASE_UI = {
  newCaseRow:
    'ring-2 ring-inset ring-emerald-400/75 bg-emerald-500/[0.08] animate-workflow-case-glow dark:ring-emerald-500/55',
  newCaseCard:
    'ring-2 ring-inset ring-emerald-400/75 bg-emerald-500/[0.07] animate-workflow-case-glow dark:ring-emerald-500/55',
  newCaseDot:
    'size-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-inset ring-emerald-400/70 animate-pulse',
} as const;
