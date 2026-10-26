'use client';

import { useId, useState } from 'react';

import { FieldLabel, SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_ISSUE_RESPONSIBILITY_LABEL,
  MAINTENANCE_ISSUE_RESPONSIBILITY_VALUES,
  MAINTENANCE_ISSUE_TRADE_OPTIONS,
  MAINTENANCE_ISSUE_URGENCY_EDIT_OPTIONS,
  MAINTENANCE_ISSUE_URGENCY_LABEL,
  SELF_MANAGED_MAINTENANCE_COPY as COPY,
  SELF_MANAGED_MAINTENANCE_LIMITS as LIMITS,
  type MaintenanceIssueResponsibility,
  type MaintenanceIssueTrade,
  type MaintenanceIssueUrgency,
} from '@/constants/self-managed-maintenance';

export interface IssueFormValues {
  description: string;
  location: string;
  /** Empty when no trade is set. */
  trade: MaintenanceIssueTrade | '';
  /** Empty when no urgency is set. */
  urgency: MaintenanceIssueUrgency | '';
  /** Empty when nobody is set to pay for this fault. */
  responsibility: MaintenanceIssueResponsibility | '';
}

/**
 * A fault's description, location, trade, urgency and who pays — adding one the AI missed, or
 * correcting one.
 */
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
  const [urgency, setUrgency] = useState<MaintenanceIssueUrgency | ''>(initial.urgency);
  const [responsibility, setResponsibility] = useState<MaintenanceIssueResponsibility | ''>(
    initial.responsibility,
  );
  // An older normal/urgent value stays pickable so opening the form doesn't hide it.
  const urgencyOptions =
    initial.urgency && !MAINTENANCE_ISSUE_URGENCY_EDIT_OPTIONS.includes(initial.urgency)
      ? [initial.urgency, ...MAINTENANCE_ISSUE_URGENCY_EDIT_OPTIONS]
      : MAINTENANCE_ISSUE_URGENCY_EDIT_OPTIONS;

  const submit = async () => {
    const ok = await onSubmit({
      description: description.trim(),
      location: location.trim(),
      trade,
      urgency,
      responsibility,
    });
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel htmlFor={`${id}-urgency`}>{COPY.issueUrgency}</FieldLabel>
          <select
            id={`${id}-urgency`}
            className={SELECT_CLASS}
            value={urgency}
            disabled={busy}
            onChange={(e) => setUrgency(e.target.value as MaintenanceIssueUrgency | '')}
          >
            <option value="" disabled={initial.urgency !== ''}>
              {COPY.issueUrgencyNone}
            </option>
            {urgencyOptions.map((option) => (
              <option key={option} value={option}>
                {MAINTENANCE_ISSUE_URGENCY_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-responsibility`}>{COPY.issueResponsibility}</FieldLabel>
          <select
            id={`${id}-responsibility`}
            className={SELECT_CLASS}
            value={responsibility}
            disabled={busy}
            onChange={(e) =>
              setResponsibility(e.target.value as MaintenanceIssueResponsibility | '')
            }
          >
            <option value="" disabled={initial.responsibility !== ''}>
              {COPY.issueResponsibilityNone}
            </option>
            {MAINTENANCE_ISSUE_RESPONSIBILITY_VALUES.map((option) => (
              <option key={option} value={option}>
                {MAINTENANCE_ISSUE_RESPONSIBILITY_LABEL[option]}
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
