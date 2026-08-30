'use client';

import type { ComponentProps, HTMLInputTypeAttribute, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  FileText,
  Lightbulb,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MAX_STRATA_CONTACT_ENTRIES = 5;

export interface StrataDetailsValues {
  buildingName: string;
  strataPlanNumber: string;
  strataName: string;
  strataEmails: string[];
  strataContactNumbers: string[];
  buildingManagerName: string;
  buildingManagerEmails: string[];
  buildingManagerContactNumbers: string[];
}

export const EMPTY_STRATA_DETAILS: StrataDetailsValues = {
  buildingName: '',
  strataPlanNumber: '',
  strataName: '',
  strataEmails: [''],
  strataContactNumbers: [''],
  buildingManagerName: '',
  buildingManagerEmails: [''],
  buildingManagerContactNumbers: [''],
};

function coerceStringList(raw: unknown, fallback?: string): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const list = raw.map((value) => (typeof value === 'string' ? value : ''));
    return list.length > 0 ? list : [''];
  }
  if (typeof raw === 'string') return [raw];
  if (fallback) return [fallback];
  return [''];
}

export function coerceStrataDetails(raw: unknown): StrataDetailsValues {
  const row =
    raw != null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    buildingName: typeof row.buildingName === 'string' ? row.buildingName : '',
    strataPlanNumber: typeof row.strataPlanNumber === 'string' ? row.strataPlanNumber : '',
    strataName: typeof row.strataName === 'string' ? row.strataName : '',
    strataEmails: coerceStringList(row.strataEmails, typeof row.strataEmail === 'string' ? row.strataEmail : ''),
    strataContactNumbers: coerceStringList(
      row.strataContactNumbers,
      typeof row.strataContactNumber === 'string' ? row.strataContactNumber : '',
    ),
    buildingManagerName: typeof row.buildingManagerName === 'string' ? row.buildingManagerName : '',
    buildingManagerEmails: coerceStringList(
      row.buildingManagerEmails,
      typeof row.buildingManagerEmail === 'string' ? row.buildingManagerEmail : '',
    ),
    buildingManagerContactNumbers: coerceStringList(
      row.buildingManagerContactNumbers,
      typeof row.buildingManagerContactNumber === 'string' ? row.buildingManagerContactNumber : '',
    ),
  };
}

export function firstFilled(values: string[]): string {
  return values.map((value) => value.trim()).find(Boolean) ?? '';
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function IconInput({
  icon: Icon,
  className,
  ...props
}: ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <Input className={cn('pl-8', className)} {...props} />
    </div>
  );
}

function RepeatableIconFields({
  label,
  values,
  onChange,
  icon,
  type,
  placeholder,
  addLabel,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  icon: LucideIcon;
  type?: HTMLInputTypeAttribute;
  placeholder: string;
  addLabel: string;
  disabled?: boolean;
}) {
  const list = values.length > 0 ? values : [''];

  const updateAt = (index: number, value: string) => {
    onChange(list.map((item, i) => (i === index ? value : item)));
  };

  const removeAt = (index: number) => {
    if (list.length <= 1) {
      onChange(['']);
      return;
    }
    onChange(list.filter((_, i) => i !== index));
  };

  const add = () => {
    if (list.length >= MAX_STRATA_CONTACT_ENTRIES) return;
    onChange([...list, '']);
  };

  return (
    <div className="space-y-2">
      {list.map((value, index) => (
        <div key={index} className="space-y-1.5">
          {index === 0 ? (
            <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
          ) : (
            <span className="sr-only">
              {label} {index + 1}
            </span>
          )}
          <div className="flex items-center gap-1">
            <IconInput
              icon={icon}
              type={type}
              value={value}
              onChange={(e) => updateAt(index, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
            {list.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-primary hover:bg-primary/10 h-8 px-2 text-xs font-medium"
        disabled={disabled || list.length >= MAX_STRATA_CONTACT_ENTRIES}
        onClick={add}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
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
    <div className="space-y-3">
      <div className="space-y-6 rounded-lg border border-border/60 bg-card p-4">
        <section className="space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
              <Building2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Strata details</p>
              <p className="text-muted-foreground text-xs">
                Optional — for strata-managed buildings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Building name">
              <IconInput
                icon={FileText}
                value={values.buildingName}
                onChange={(e) => set('buildingName', e.target.value)}
                placeholder="e.g. Harbour View"
                disabled={disabled}
              />
            </FormField>
            <FormField label="Strata plan number">
              <IconInput
                icon={FileText}
                value={values.strataPlanNumber}
                onChange={(e) => set('strataPlanNumber', e.target.value)}
                placeholder="e.g. SP12345"
                disabled={disabled}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <FormField label="Strata name">
              <IconInput
                icon={Users}
                value={values.strataName}
                onChange={(e) => set('strataName', e.target.value)}
                placeholder="Strata manager or body corporate"
                disabled={disabled}
              />
            </FormField>
            <RepeatableIconFields
              label="Strata email"
              values={values.strataEmails}
              onChange={(strataEmails) => set('strataEmails', strataEmails)}
              icon={Mail}
              type="email"
              placeholder="strata@example.com"
              addLabel="Add email"
              disabled={disabled}
            />
            <RepeatableIconFields
              label="Strata contact number"
              values={values.strataContactNumbers}
              onChange={(strataContactNumbers) => set('strataContactNumbers', strataContactNumbers)}
              icon={Phone}
              type="tel"
              placeholder="+61 400 000 000"
              addLabel="Add contact number"
              disabled={disabled}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Building manager (if different)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <FormField label="Building manager's name">
              <IconInput
                icon={UserRound}
                value={values.buildingManagerName}
                onChange={(e) => set('buildingManagerName', e.target.value)}
                placeholder="Building manager"
                disabled={disabled}
              />
            </FormField>
            <RepeatableIconFields
              label="Building manager's email"
              values={values.buildingManagerEmails}
              onChange={(buildingManagerEmails) => set('buildingManagerEmails', buildingManagerEmails)}
              icon={Mail}
              type="email"
              placeholder="manager@example.com"
              addLabel="Add email"
              disabled={disabled}
            />
            <RepeatableIconFields
              label="Building manager's contact number"
              values={values.buildingManagerContactNumbers}
              onChange={(buildingManagerContactNumbers) =>
                set('buildingManagerContactNumbers', buildingManagerContactNumbers)
              }
              icon={Phone}
              type="tel"
              placeholder="+61 400 000 000"
              addLabel="Add contact number"
              disabled={disabled}
            />
          </div>
        </section>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Don&apos;t have all the details now? You can add or update strata information later.
        </p>
      </div>
    </div>
  );
}
