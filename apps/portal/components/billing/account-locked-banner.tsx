'use client';

import { Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

const BANNER_STYLE: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  gap: '1rem',
  alignItems: 'flex-start',
  border: '2px solid #fecaca',
  borderRadius: '1.15rem',
  padding: '1.15rem 1.2rem',
  color: '#fff7ed',
  background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 55%, #450a0a 100%)',
  boxShadow:
    '0 0 0 6px rgba(220, 38, 38, 0.28), 0 18px 40px rgba(127, 29, 29, 0.5), inset 0 1px 0 rgba(254, 226, 226, 0.3)',
};

const COMPACT_STYLE: React.CSSProperties = {
  ...BANNER_STYLE,
  gap: '0.7rem',
  padding: '0.9rem 1rem',
  borderRadius: 0,
  borderWidth: '0 0 2px',
  boxShadow: 'none',
  animation: 'none',
};

const ICON_STYLE: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  width: '2.75rem',
  height: '2.75rem',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: 'rgba(0, 0, 0, 0.3)',
  boxShadow: '0 0 0 4px rgba(254, 202, 202, 0.25)',
  color: '#fff7ed',
};

export function AccountLockedBanner({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn('account-locked-alert', compact && 'account-locked-alert--compact', className)}
      style={compact ? COMPACT_STYLE : BANNER_STYLE}
    >
      <span
        className="account-locked-alert__icon"
        style={{
          ...ICON_STYLE,
          ...(compact ? { width: '1.75rem', height: '1.75rem', boxShadow: 'none' } : null),
        }}
      >
        <Lock className={compact ? 'size-4' : 'size-6'} />
      </span>
      <div className="min-w-0">
        <p
          className="account-locked-alert__title"
          style={{
            margin: 0,
            fontSize: compact ? '0.82rem' : '1.05rem',
            fontWeight: 800,
            letterSpacing: compact ? '0.02em' : '-0.02em',
            lineHeight: 1.25,
            textTransform: 'uppercase',
            color: '#fff7ed',
          }}
        >
          Account locked {'\u2014'} invoice overdue
        </p>
        <p
          className="account-locked-alert__copy"
          style={{
            margin: compact ? '0.15rem 0 0' : '0.3rem 0 0',
            fontSize: compact ? '0.75rem' : '0.95rem',
            lineHeight: 1.45,
            fontWeight: 600,
            color: '#ffedd5',
          }}
        >
          {compact
            ? 'Pay this invoice to restore full access to the Agent app.'
            : 'Pay your outstanding service invoice below to restore full access to the Agent app.'}
        </p>
      </div>
    </div>
  );
}
