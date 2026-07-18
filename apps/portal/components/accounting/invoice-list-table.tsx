'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';

import {
  ModuleListTable,
  ModuleTableHead,
} from '@/components/agent/module-list-table';
import { Button } from '@/components/ui/button';
import { formatInvoiceDate } from '@/lib/invoice-math';
import type { AgentInvoiceListItem } from '@/lib/crossub-api/agent-client';

export function InvoiceListTable({
  items,
  onPreview,
  onEdit,
  onDelete,
}: {
  items: AgentInvoiceListItem[];
  onPreview: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ModuleListTable minWidth={900}>
      <ModuleTableHead
        columns={[
          'Invoice Number',
          'Invoice Period',
          'Invoice Date',
          'Due Date',
          'Actions',
        ]}
      />
      <tbody className="divide-y">
        {items.map((invoice) => (
          <tr key={invoice.id} className="bg-card">
            <td className="whitespace-nowrap px-3 py-3 font-medium">
              {invoice.invoiceNumber}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              {formatInvoiceDate(invoice.periodStart)} –{' '}
              {formatInvoiceDate(invoice.periodEnd)}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              {formatInvoiceDate(invoice.invoiceDate)}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-sm">
              {formatInvoiceDate(invoice.dueDate)}
            </td>
            <td className="px-3 py-3">
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Preview"
                  onClick={() => onPreview(invoice.id)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Edit"
                  onClick={() => onEdit(invoice.id)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive size-8"
                  title="Delete"
                  onClick={() => onDelete(invoice.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </ModuleListTable>
  );
}
