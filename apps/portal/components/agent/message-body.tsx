import { renderMentionSegments } from '@/lib/message-mentions';
import { cn } from '@/lib/utils';

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
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
