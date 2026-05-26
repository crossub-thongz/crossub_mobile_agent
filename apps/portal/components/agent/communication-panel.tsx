import { Mail, MessageSquare } from 'lucide-react';

import { formatDateTime } from '@/lib/utils';

export function CommunicationPanel({
  items,
}: {
  items: { title: string; message: string; channel: 'in_app' | 'email'; at: string }[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No messages linked to this task yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border bg-card px-3 py-2 text-xs">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            {item.channel === 'email' ? (
              <Mail className="size-3" />
            ) : (
              <MessageSquare className="size-3" />
            )}
            <span className="font-medium text-foreground">{item.title}</span>
            <span>· {formatDateTime(item.at)}</span>
          </div>
          <p className="leading-relaxed">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
