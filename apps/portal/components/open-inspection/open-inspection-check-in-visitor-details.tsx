import type { OpenInspectionVisitor } from '@/constants/open-inspection-ops';

export function interestOnApplicationLabel(visitor: OpenInspectionVisitor): string {
  const decision = visitor.application?.agentDecision;
  if (decision === 'approved') return 'Yes';
  if (decision === 'rejected') return 'No';
  if (visitor.application) return 'Pending';
  return '—';
}

export function OpenInspectionCheckInVisitorDetails({
  visitor,
  sessionLeaseTerm,
  variant = 'compact',
}: {
  visitor: OpenInspectionVisitor;
  /** Listing/session lease term when the prospect did not specify one. */
  sessionLeaseTerm?: string;
  variant?: 'compact' | 'detailed';
}) {
  const leaseTerm = visitor.leaseTerm?.trim() || sessionLeaseTerm?.trim() || '—';
  const pets = visitor.pets?.trim() || '—';
  const specialRequest = visitor.followUpNote?.trim() || '—';
  const comments = visitor.checkInComments?.trim() || '—';
  const interest = interestOnApplicationLabel(visitor);

  if (variant === 'detailed') {
    return (
      <dl className="text-muted-foreground mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <dt className="text-foreground/70 font-medium">Lease term</dt>
          <dd>{leaseTerm}</dd>
        </div>
        <div>
          <dt className="text-foreground/70 font-medium">Pets</dt>
          <dd>{pets}</dd>
        </div>
        <div>
          <dt className="text-foreground/70 font-medium">Interest on application</dt>
          <dd>{interest}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-foreground/70 font-medium">Visitor special request</dt>
          <dd>{specialRequest}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-foreground/70 font-medium">Comments</dt>
          <dd>{comments}</dd>
        </div>
      </dl>
    );
  }

  const lines: string[] = [];
  if (visitor.leaseTerm?.trim() || sessionLeaseTerm?.trim()) {
    lines.push(`Lease term: ${leaseTerm}`);
  }
  if (visitor.pets?.trim()) lines.push(`Pets: ${visitor.pets.trim()}`);
  if (visitor.followUpNote?.trim()) {
    lines.push(`Special request: ${visitor.followUpNote.trim()}`);
  }
  if (visitor.checkInComments?.trim()) {
    lines.push(`Comments: ${visitor.checkInComments.trim()}`);
  }
  if (visitor.application) {
    lines.push(`Interest on application: ${interest}`);
  }

  if (lines.length === 0) return null;

  return (
    <div className="text-muted-foreground space-y-0.5 text-[11px]">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
