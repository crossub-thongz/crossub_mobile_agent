const STAGES = [
  'under_review',
  'pending_quotation',
  'pending_approval',
  'in_progress',
  'completed',
  'closed',
] as const;

const LABELS: Record<string, string> = {
  under_review: 'Review',
  pending_quotation: 'Quoting',
  pending_approval: 'Approval',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
};

export function MaintenanceStageTracker({ current }: { current: string }) {
  const normalized = current.toLowerCase().replace(/\s+/g, '_');
  const idx = STAGES.findIndex(
    (s) => s === normalized || LABELS[s]?.toLowerCase() === current.toLowerCase(),
  );

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {STAGES.map((stage, i) => {
        const active = i === idx;
        const done = idx >= 0 && i < idx;
        return (
          <div
            key={stage}
            className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${
              active
                ? 'bg-primary/15 text-primary'
                : done
                  ? 'bg-primary/5 text-primary/70'
                  : 'bg-secondary text-muted-foreground'
            }`}
          >
            {LABELS[stage]}
          </div>
        );
      })}
    </div>
  );
}
