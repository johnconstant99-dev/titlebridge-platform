import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  markClassName,
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <svg
        viewBox="0 0 32 32"
        className={cn("size-8", markClassName)}
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#1F3D34" />
        <path
          d="M7 20.5h18M9 20.5V12.5h4.5v8M18.5 20.5V12.5H23v8M7 12.5h18"
          stroke="#F7F4EE"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="square"
        />
      </svg>
      {wordmark ? (
        <span className="font-display text-lg tracking-tight">{APP_NAME}</span>
      ) : (
        <span className="sr-only">{APP_NAME}</span>
      )}
    </span>
  );
}
