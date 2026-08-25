import { cn } from "@/lib/utils";

type ChecklistProgressRingProps = {
  className?: string;
  compact?: boolean;
  label: string;
  value: number;
};

export function ChecklistProgressRing({
  className,
  compact = false,
  label,
  value,
}: ChecklistProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={`${label} ${normalizedValue}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalizedValue}
      className={cn(
        "relative grid shrink-0 place-items-center text-on-highlight",
        compact ? "size-[4.75rem]" : "size-24",
        className,
      )}
      role="progressbar"
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-on-highlight/20"
          cx="50"
          cy="50"
          fill="none"
          r="43"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          className="text-on-highlight transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          cx="50"
          cy="50"
          fill="none"
          pathLength="100"
          r="43"
          stroke="currentColor"
          strokeDasharray="100"
          strokeDashoffset={100 - normalizedValue}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <span className="relative grid place-items-center leading-none">
        <strong className={cn("font-bold", compact ? "text-xl" : "text-2xl")}>
          {normalizedValue}%
        </strong>
        <span className="mt-1 text-xs font-medium text-on-highlight">
          完成
        </span>
      </span>
    </div>
  );
}
