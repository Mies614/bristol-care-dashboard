import type { DailyCareResult } from "@/lib/dailyCare";

export function DailyCareCard({ care }: { care: DailyCareResult }) {
  return (
    <section className="soft-card bg-gradient-to-br from-white/88 via-butter/45 to-blush/45">
      <p className="section-kicker mb-1">Daily Care</p>
      <h2 className="text-lg font-semibold text-cocoa">{care.greeting}</h2>
      <div className="mt-3 space-y-2 text-sm leading-6 text-cocoa/70">
        <p>{care.careMessage}</p>
        <p className="rounded-2xl bg-white/58 px-3 py-2 font-medium text-cocoa/76">{care.topReminderText}</p>
        <p>{care.memoryHint}</p>
      </div>
    </section>
  );
}
