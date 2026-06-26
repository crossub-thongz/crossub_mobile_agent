'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Download, MessageSquare } from 'lucide-react';

import { PropertyChatDialog } from '@/components/agent/property-chat-dialog';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import type { LeaseDocumentItem, LeaseHistoryItem, RentPaymentRecord } from '@/lib/lease-package-data';
import type { MessageCategory } from '@/lib/types';

function CollapsibleHistoryRow({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="space-y-2 border-t px-3 py-2.5">{children}</div> : null}
    </div>
  );
}

function rentStatusClass(status: RentPaymentRecord['status']) {
  if (status === 'paid') {
    return 'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary';
  }
  if (status === 'late') {
    return 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400';
  }
  return 'rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive';
}

export function LeaseHistorySection({
  title,
  icon: Icon,
  empty,
  isEmpty,
  children,
  collapsible = false,
  defaultOpen = true,
  itemCount,
}: {
  title: string;
  icon: LucideIcon;
  empty?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  itemCount?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const countLabel =
    itemCount != null && itemCount > 0 ? ` (${itemCount})` : isEmpty ? '' : '';

  const header = (
    <>
      <Icon className="text-primary size-4 shrink-0" />
      <h2 className="min-w-0 flex-1 text-left text-sm font-semibold">
        {title}
        {countLabel ? (
          <span className="text-muted-foreground font-normal">{countLabel}</span>
        ) : null}
      </h2>
      {collapsible ? (
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      ) : null}
    </>
  );

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 border-b px-4 py-3 text-left"
          aria-expanded={open}
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 border-b px-4 py-3">{header}</div>
      )}
      {(!collapsible || open) && (
        <div className="p-3">
          {isEmpty ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">{empty ?? 'No records.'}</p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}

export function LeaseDocumentList({ documents }: { documents: LeaseDocumentItem[] }) {
  return (
    <div className="space-y-1.5">
      {documents.map((doc) => (
        <CollapsibleHistoryRow
          key={doc.id}
          header={
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 font-medium">{doc.label}</span>
              <span
                className={
                  doc.status === 'available'
                    ? 'text-muted-foreground shrink-0 text-[10px] font-medium capitalize'
                    : 'text-muted-foreground shrink-0 text-[10px] font-medium'
                }
              >
                {doc.status === 'available' ? 'On file' : 'Pending'}
              </span>
            </div>
          }
        >
          {doc.status === 'available' && doc.href ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={doc.href} className="text-primary text-xs font-semibold">
                View
              </Link>
              {(doc.downloadUrl ?? doc.href) && (
                <a
                  href={doc.downloadUrl ?? doc.href}
                  download={doc.label}
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <Download className="size-3" />
                  Download
                </a>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">This document is not yet available.</p>
          )}
        </CollapsibleHistoryRow>
      ))}
    </div>
  );
}

export function LeaseHistoryList({
  items,
  propertyId,
  propertyAddress,
}: {
  items: LeaseHistoryItem[];
  propertyId: string;
  propertyAddress: string;
}) {
  const [chatCase, setChatCase] = useState<{
    caseId: string;
    category: MessageCategory;
    title: string;
  } | null>(null);

  return (
    <>
      <div className="space-y-1.5">
        {items.map((item) => (
          <CollapsibleHistoryRow
            key={item.id}
            header={
              <div className="min-w-0">
                <p className="font-medium leading-snug">{item.label}</p>
                {item.sublabel ? (
                  <p className="text-muted-foreground truncate text-xs">{item.sublabel}</p>
                ) : null}
              </div>
            }
          >
            <div className="space-y-2">
              {item.date ? (
                <p className="text-muted-foreground text-[10px]">{formatDateTime(item.date)}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={item.href}
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
                >
                  View details
                  <ChevronRight className="size-3" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setChatCase({
                      caseId: item.id,
                      category: item.messageCategory,
                      title: item.label,
                    })
                  }
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <MessageSquare className="size-3" />
                  Follow up
                </button>
              </div>
            </div>
          </CollapsibleHistoryRow>
        ))}
      </div>

      <PropertyChatDialog
        open={chatCase !== null}
        onClose={() => setChatCase(null)}
        propertyId={propertyId}
        propertyAddress={propertyAddress}
        category={chatCase?.category}
        caseId={chatCase?.caseId}
        title={chatCase ? `Follow up — ${chatCase.title}` : 'Case follow up'}
      />
    </>
  );
}

export function RentHistoryList({ payments }: { payments: RentPaymentRecord[] }) {
  return (
    <div className="space-y-1.5">
      {payments.map((p) => (
        <CollapsibleHistoryRow
          key={p.id}
          header={
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{formatCurrency(p.amount)}</span>
              <span className={rentStatusClass(p.status)}>{p.status}</span>
            </div>
          }
        >
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground text-xs">
              {p.reference ?? 'Rent payment'}
            </p>
            <p className="text-muted-foreground text-[10px]">{formatDateTime(p.at)}</p>
          </div>
        </CollapsibleHistoryRow>
      ))}
    </div>
  );
}
