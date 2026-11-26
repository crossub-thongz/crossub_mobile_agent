'use client';

import { useState } from 'react';

import { MessageBody } from '@/components/agent/message-body';
import { EmailAttachmentList } from '@/components/agent/email-attachment-list';
import { EMAIL_BODY_COPY } from '@/constants/email-body';
import type { JobCaseEmailAttachment } from '@/lib/job-case-email';
import { httpLinks, splitQuotedHistory, stripReplyMarks, toDisplayBody } from '@/lib/message-body';
import { cn } from '@/lib/utils';
import {
  attachmentSizeLabel,
  emailAttachmentFacts,
  resolveAttachmentName,
  type EmailAttachmentFacts,
} from '@/utils/received-email-attachments';

type ReceivedFile = Parameters<typeof emailAttachmentFacts>[0];

function toListAttachments(items: readonly ReceivedFile[] | null | undefined): JobCaseEmailAttachment[] {
  if (!items?.length) return [];
  return items.map((item) => {
    const facts: EmailAttachmentFacts = emailAttachmentFacts(item);
    const name = resolveAttachmentName(facts);
    return {
      name,
      fileName: name,
      mimeType: facts.mimeType,
      url: facts.url,
      inline: facts.inline,
      contentId: facts.contentId,
      sizeBytes: facts.sizeBytes,
      sizeLabel: attachmentSizeLabel(facts),
    };
  });
}

/**
 * One received email: the new note, any link that would otherwise sit only in the
 * forward, the files, and the quoted original behind one control.
 */
export function EmailMessageContent({
  body,
  attachments,
  className,
}: {
  body: string;
  attachments?: readonly ReceivedFile[] | null;
  className?: string;
}) {
  const display = toDisplayBody(body);
  const plain = stripReplyMarks(display);
  const { reply, quoted } = splitQuotedHistory(display);
  const links = httpLinks(plain);
  const files = toListAttachments(attachments);
  const [showQuoted, setShowQuoted] = useState(false);

  return (
    <div>
      {reply ? <MessageBody body={reply} className={className} /> : null}
      {links.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">
            {EMAIL_BODY_COPY.links}
          </p>
          <ul className="space-y-1">
            {links.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all underline underline-offset-2"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {files.length > 0 ? <EmailAttachmentList attachments={files} variant="inline" /> : null}
      {quoted ? (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs underline underline-offset-2"
            onClick={() => setShowQuoted((open) => !open)}
          >
            {showQuoted ? EMAIL_BODY_COPY.hideQuotedHistory : EMAIL_BODY_COPY.showQuotedHistory}
          </button>
          {showQuoted ? (
            <MessageBody body={quoted} className={cn('mt-1 opacity-80', className)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
