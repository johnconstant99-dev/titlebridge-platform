import { PLATFORM_DISCLAIMER } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-stone px-4 py-6">
      <p className="mx-auto max-w-5xl text-xs leading-relaxed text-muted">
        {PLATFORM_DISCLAIMER}
      </p>
    </footer>
  );
}
