'use client';

import { useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_ISSUE_TRADE_OPTIONS,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
  type MaintenanceIssueTrade,
} from '@/constants/self-managed-maintenance';

export interface IssueFormValues {
  description: string;
  location: string;
  /** Empty when no trade is set. */
  trade: MaintenanceIssueTrade | '';
}

/** A fault's description, location and trade — adding one the AI missed, or correcting one. */
export function IssueForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: IssueFormValues;
  submitLabel: string;
  busy: boolean;
  /** Resolves true when saved, so the form can close. */
  onSubmit: (values: IssueFormValues) => Promise<boolean>;
  onCancel: () => void;
}) {
  const id = useId();
  const [description, setDescription] = useState(initial.description);
  const [location, setLocation] = useState(initial.location);
  const [trade, setTrade] = useState<MaintenanceIssueTrade | ''>(initial.trade);

  const submit = async () => {
    const ok = await onSubmit({ description: description.trim(), location: location.trim(), trade });
    if (ok) onCancel();
  };

  return (
    <div className="border-border/60 space-y-2 rounded-md border p-2.5">
      <div>
        <FieldLabel htmlFor={`${id}-description`}>{COPY.issueDescription}</FieldLabel>
        <Input
          id={`${id}-description`}
          value={description}
          maxLength={LIMITS.issueDescriptionMax}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel htmlFor={`${id}-location`}>{COPY.issueLocation}</FieldLabel>
          <Input
            id={`${id}-location`}
            value={location}
            maxLength={LIMITS.issueLocationMax}
            disabled={busy}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-trade`}>{COPY.issueTrade}</FieldLabel>
          <select
            id={`${id}-trade`}
            className={SELECT_CLASS}
            value={trade}
            disabled={busy}
            onChange={(e) => setTrade(e.target.value as MaintenanceIssueTrade | '')}
          >
            <option value="">{COPY.issueTradeNone}</option>
            {MAINTENANCE_ISSUE_TRADE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !description.trim()} onClick={() => void submit()}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          {COPY.cancel}
        </Button>
      </div>
    </div>
  );
}
