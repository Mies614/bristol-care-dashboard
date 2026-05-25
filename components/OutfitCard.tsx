import type { OutfitSuggestion } from "@/lib/outfit";

export function OutfitCard({ suggestion }: { suggestion: OutfitSuggestion }) {
  return (
    <section className="soft-card bg-gradient-to-br from-white/90 via-blush/45 to-butter/45">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] border border-white/80 bg-white/65 text-3xl shadow-sm">
          {suggestion.emoji}
        </div>
        <div>
          <p className="section-kicker mb-1">Outfit</p>
          <h2 className="font-semibold text-cocoa">{suggestion.title}</h2>
          <p className="mt-1 text-sm leading-6 text-cocoa/70">{suggestion.summary}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestion.layers.map((item) => (
          <span className="pill" key={item}>
            {item}
          </span>
        ))}
        {suggestion.accessories.map((item) => (
          <span className="rounded-full border border-white/70 bg-skySoft/70 px-3 py-1 text-xs font-medium text-cocoa shadow-sm" key={item}>
            {item}
          </span>
        ))}
      </div>
      {suggestion.warnings.length ? (
        <div className="mt-4 space-y-2">
          {suggestion.warnings.map((warning) => (
            <p className="rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-sm leading-6 text-cocoa/75 shadow-sm" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
