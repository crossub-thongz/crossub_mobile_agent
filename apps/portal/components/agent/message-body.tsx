import { linkSpans } from '@/lib/message-body';
import { renderMentionSegments } from '@/lib/message-mentions';
import { cn } from '@/lib/utils';

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

export function MessageBody({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const segments = renderMentionSegments(body);

  return (
    <p className={cn('whitespace-pre-wrap', className)}>
      {segments.map((segment, index) =>
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
      )}
    </p>
  );
}
