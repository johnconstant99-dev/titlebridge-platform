import { TITLE_STEP_LABELS, TITLE_STEPS } from "@/lib/constants";
import type { TitleStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const VISIBLE = TITLE_STEPS.filter((step) => step !== "submitted");

export function TitleStepper({ current }: { current: TitleStep }) {
  const index = VISIBLE.indexOf(current === "submitted" ? "review" : current);
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {VISIBLE.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li
            key={step}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              active ? "bg-primary text-primary-fg" : done ? "bg-success/10 text-success" : "bg-stone text-muted",
            )}
          >
            {i + 1}. {TITLE_STEP_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
