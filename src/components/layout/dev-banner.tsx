export function DevBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-primary-fg">
      Development Data — fictional records only. Not live DMV, NMVTIS, AAMVA, or government data.
    </div>
  );
}
