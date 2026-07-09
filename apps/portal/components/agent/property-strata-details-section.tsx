'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface StrataDetailsValues {
  buildingName: string;
  strataPlanNumber: string;
  strataName: string;
  strataEmail: string;
  strataContactNumber: string;
  buildingManagerName: string;
  buildingManagerEmail: string;
  buildingManagerContactNumber: string;
}

export const EMPTY_STRATA_DETAILS: StrataDetailsValues = {
  buildingName: '',
  strataPlanNumber: '',
  strataName: '',
  strataEmail: '',
  strataContactNumber: '',
  buildingManagerName: '',
  buildingManagerEmail: '',
  buildingManagerContactNumber: '',
};

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function PropertyStrataDetailsSection({
  values,
  onChange,
  disabled,
}: {
  values: StrataDetailsValues;
  onChange: (patch: Partial<StrataDetailsValues>) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof StrataDetailsValues>(key: K, value: StrataDetailsValues[K]) =>
    onChange({ [key]: value });

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Strata details</p>
        <p className="text-muted-foreground text-xs">Optional — for strata-managed buildings.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Building name">
          <Input
            value={values.buildingName}
            onChange={(e) => set('buildingName', e.target.value)}
            placeholder="e.g. Harbour View"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Strata plan number">
          <Input
            value={values.strataPlanNumber}
            onChange={(e) => set('strataPlanNumber', e.target.value)}
            placeholder="e.g. SP12345"
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Strata name">
          <Input
            value={values.strataName}
            onChange={(e) => set('strataName', e.target.value)}
            placeholder="Strata manager or body corporate"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Strata email">
          <Input
            type="email"
            value={values.strataEmail}
            onChange={(e) => set('strataEmail', e.target.value)}
            placeholder="strata@example.com"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Strata contact number">
          <Input
            type="tel"
            value={values.strataContactNumber}
            onChange={(e) => set('strataContactNumber', e.target.value)}
            placeholder="+61 400 000 000"
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Building manager's name">
          <Input
            value={values.buildingManagerName}
            onChange={(e) => set('buildingManagerName', e.target.value)}
            placeholder="Building manager"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Building manager's email">
          <Input
            type="email"
            value={values.buildingManagerEmail}
            onChange={(e) => set('buildingManagerEmail', e.target.value)}
            placeholder="manager@example.com"
            disabled={disabled}
          />
        </FormField>
        <FormField label="Building manager's contact number">
          <Input
            type="tel"
            value={values.buildingManagerContactNumber}
            onChange={(e) => set('buildingManagerContactNumber', e.target.value)}
            placeholder="+61 400 000 000"
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
}
