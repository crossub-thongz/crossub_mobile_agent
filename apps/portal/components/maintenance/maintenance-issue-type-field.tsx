'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MAINTENANCE_ISSUE_TYPE_OTHER,
  MAINTENANCE_ISSUE_TYPES,
} from '@/constants/maintenance-issue-types';
import { cn } from '@/lib/utils';

const SELECT_CLASS =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';

type Props = {
  id?: string;
  selection: string;
  otherDetail: string;
  onSelectionChange: (value: string) => void;
  onOtherDetailChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
};

export function MaintenanceIssueTypeField({
  id = 'maintenance-issue-type',
  selection,
  otherDetail,
  onSelectionChange,
  onOtherDetailChange,
  disabled = false,
  label = 'Issue type',
  required = true,
}: Props) {
  const showOtherInput = selection === MAINTENANCE_ISSUE_TYPE_OTHER;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
        {required ? ' *' : null}
      </Label>
      <select
        id={id}
        className={cn(SELECT_CLASS)}
        value={selection}
        onChange={(e) => onSelectionChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select issue type</option>
        {MAINTENANCE_ISSUE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {showOtherInput ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-other`} className="text-muted-foreground text-xs">
            Describe the issue *
          </Label>
          <Input
            id={`${id}-other`}
            inputKind="internal_note"
            value={otherDetail}
            onChange={(e) => onOtherDetailChange(e.target.value)}
            placeholder="Enter issue type"
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
