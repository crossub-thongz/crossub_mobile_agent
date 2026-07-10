'use client';

export function DocumentUploadProgress({
  percent,
  label = 'Uploading',
  className,
}: {
  percent: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={className} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="text-primary shrink-0 font-semibold tabular-nums">{clamped}%</span>
      </div>
      <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
