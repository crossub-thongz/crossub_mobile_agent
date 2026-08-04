import type { MessageThread, Property } from '@/lib/types';
import { formatDateTime, formatPropertyFullAddress } from '@/lib/utils';
import { formatListingDetails } from '@/lib/gii-property-context';

/** Must fit in `GiiChatMessageDto.content` (@MaxLength 4000) including the runQuery wrapper. */
export const GII_MESSAGE_CONTEXT_MAX_CHARS = 3600;

function truncateContext(text: string, max = GII_MESSAGE_CONTEXT_MAX_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 48).trimEnd()}\n\n[…earlier context truncated for length]`;
}

/** Pre-built context Gii receives on every turn — message body, address, and listing facts. */
export function buildGiiMessageContext(args: {
  thread: MessageThread;
  property?: Property | null;
}): string {
  const { thread, property } = args;
  const header: string[] = [];

  header.push(`Subject: ${thread.subject}`);
  header.push(
    `Property address: ${
      property ? formatPropertyFullAddress(property) : thread.propertyAddress
    }`,
  );

  const listing = property ? formatListingDetails(property) : '';
  if (listing) header.push(`Listing details: ${listing}`);

  header.push(`Landlord: ${property?.homeOwnerName ?? thread.homeOwnerName}`);
  header.push(`Tenant: ${property?.tenantName ?? thread.tenantName}`);

  if (thread.messageCategory || thread.taskType) {
    header.push(`Category: ${thread.messageCategory ?? thread.taskType}`);
  }

  const headerText = header.join('\n');
  const threadBudget = Math.max(
    400,
    GII_MESSAGE_CONTEXT_MAX_CHARS - headerText.length - 80,
  );

  const threadBlocks: string[] = [];
  let used = 0;
  let omitted = 0;

  // Newest messages first — keep recent context when the thread is long.
  for (const msg of [...thread.messages].reverse()) {
    const block = [
      `--- ${msg.from} · ${formatDateTime(msg.at)} · ${msg.channel} ---`,
      msg.body.trim(),
      '',
    ].join('\n');
    if (used + block.length > threadBudget) {
      omitted += 1;
      continue;
    }
    threadBlocks.unshift(block);
    used += block.length;
  }

  if (threadBlocks.length === 0 && thread.messages.length > 0) {
    const latest = thread.messages[thread.messages.length - 1]!;
    const latestBody = latest.body.trim().slice(0, threadBudget - 120);
    threadBlocks.push(
      [
        `--- ${latest.from} · ${formatDateTime(latest.at)} · ${latest.channel} ---`,
        latestBody,
        latest.body.length > latestBody.length ? '[…message truncated]' : '',
        '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    omitted = thread.messages.length - 1;
  }

  const lines = [...header, ''];
  if (omitted > 0) {
    lines.push(
      `Message thread (${omitted} earlier message${omitted === 1 ? '' : 's'} omitted — ask if you need them):`,
    );
  } else {
    lines.push('Message thread:');
  }
  lines.push(...threadBlocks);

  return truncateContext(lines.join('\n').trim());
}
