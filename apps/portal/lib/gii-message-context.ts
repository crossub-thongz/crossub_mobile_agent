import type { MessageThread, Property } from '@/lib/types';
import { formatDateTime, formatPropertyFullAddress } from '@/lib/utils';
import { formatListingDetails } from '@/lib/gii-property-context';

/** Pre-built context Gii receives on every turn — message body, address, and listing facts. */
export function buildGiiMessageContext(args: {
  thread: MessageThread;
  property?: Property | null;
}): string {
  const { thread, property } = args;
  const lines: string[] = [];

  lines.push(`Subject: ${thread.subject}`);
  lines.push(
    `Property address: ${
      property ? formatPropertyFullAddress(property) : thread.propertyAddress
    }`,
  );

  const listing = property ? formatListingDetails(property) : '';
  if (listing) lines.push(`Listing details: ${listing}`);

  lines.push(`Landlord: ${property?.homeOwnerName ?? thread.homeOwnerName}`);
  lines.push(`Tenant: ${property?.tenantName ?? thread.tenantName}`);

  if (thread.messageCategory || thread.taskType) {
    lines.push(`Category: ${thread.messageCategory ?? thread.taskType}`);
  }

  lines.push('', 'Message thread:');
  for (const msg of thread.messages) {
    lines.push(`--- ${msg.from} · ${formatDateTime(msg.at)} · ${msg.channel} ---`);
    lines.push(msg.body.trim());
    lines.push('');
  }

  return lines.join('\n').trim();
}
