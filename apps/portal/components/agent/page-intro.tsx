export function PageIntro({
  title,
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
