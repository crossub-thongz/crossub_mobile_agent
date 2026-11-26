import { linkSpans, splitReplyRuns } from '@/lib/message-body';
import { renderMentionSegments } from '@/lib/message-mentions';
import { cn } from '@/lib/utils';

const REPLY_BLUE = 'text-blue-700 dark:text-blue-300';

function LinkifiedText({ text }: { text: string }) {
  return linkSpans(text).map((span, index) =>
    span.href ? (
      <a
        key={`${index}-${span.href}`}
        href={span.href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2"
      >
        {span.text}
      </a>
    ) : (
      <span key={`${index}-${span.text}`}>{span.text}</span>
    ),
  );
}

function MentionedText({ text }: { text: string }) {
  const segments = renderMentionSegments(text);
  return segments.map((segment, index) =>
    segment.mention ? (
      <span
        key={`${index}-${segment.text}`}
        className="text-primary rounded bg-primary/15 px-0.5 font-medium"
      >
        {segment.text}
      </span>
    ) : (
      <LinkifiedText key={`${index}-${segment.text}`} text={segment.text} />
    ),
  );
}

export function MessageBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const runs = splitReplyRuns(body);

  return (
    <p className={cn('whitespace-pre-wrap', className)}>
      {runs.map((run, index) =>
        run.blue ? (
          <span key={index} className={REPLY_BLUE}>
            <MentionedText text={run.text} />
          </span>
        ) : (
          <MentionedText key={index} text={run.text} />
        ),
      )}
    </p>
  );
}
