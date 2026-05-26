import type { MessageThread } from '@/lib/types';

function cleanTenantName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function buildAiDraftReply(
  thread: MessageThread,
  party?: 'tenant' | 'owner',
): string {
  const tenant = cleanTenantName(thread.tenantName);
  const owner = thread.homeOwnerName;
  const address = thread.propertyAddress.split(',')[0];

  if (party === 'tenant') {
    if (thread.taskType === 'Maintenance') {
      return `Hi ${tenant},

I'm following up regarding maintenance at ${address}. I'll keep you updated on timing and access requirements.

Please let me know if you have any questions in the meantime.

Regards`;
    }

    if (thread.taskType === 'Inspection') {
      return `Hi ${tenant},

Just confirming the upcoming inspection at ${address}. I'll share the final schedule shortly.

Please reply if there are any access constraints I should know about.

Regards`;
    }

    return `Hi ${tenant},

Following up regarding ${address}. Please let me know if you have any questions.

Regards`;
  }

  if (party === 'owner') {
    if (thread.taskType === 'Maintenance') {
      return `Hi ${owner},

I'm reviewing the maintenance quote for ${address} and will confirm my decision shortly.

I'll keep you updated on progress.

Regards`;
    }

    if (thread.taskType === 'Inspection') {
      return `Hi ${owner},

Confirming the inspection schedule for ${address}. I'll share any outcomes once the report is available.

Regards`;
    }

    return `Hi ${owner},

Following up regarding ${address}. I'll keep you informed of any updates.

Regards`;
  }

  if (thread.taskType === 'Maintenance') {
    return `Hi CROSSUB team,

Thanks for the update regarding ${address} (landlord: ${owner}, tenant: ${tenant}).

I've reviewed the maintenance quote and will confirm my decision shortly via the app. Please keep ${tenant} informed if any access is required.

Regards`;
  }

  if (thread.taskType === 'Inspection') {
    return `Hi CROSSUB team,

Thanks for confirming the inspection schedule for ${address} (landlord: ${owner}, tenant: ${tenant}).

Please let me know if ${tenant} needs to be present or if keys need to be arranged.

Regards`;
  }

  return `Hi CROSSUB team,

Thanks for your message regarding ${address} (landlord: ${owner}, tenant: ${tenant}).

I've noted the update and will follow up shortly via the app.

Regards`;
}
