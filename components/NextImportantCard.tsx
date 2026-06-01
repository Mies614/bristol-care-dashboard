"use client";

import Link from "next/link";
import type { NextImportantResult } from "./TodayCareSummary";

export type { NextImportantResult };

export function NextImportantCard({ result }: { result: NextImportantResult }) {
  return (
    <section className="soft-card bg-gradient-to-br from-white/85 via-lilac/35 to-skySoft/40">
      <p className="section-kicker mb-1">Next</p>
      <h2 className="text-lg font-semibold text-cocoa">{result.label}</h2>
      <p className="mt-2 text-sm leading-6 text-cocoa/70">{result.title}</p>
      {result.detail ? (
        <p className="mt-1 text-xs leading-5 text-cocoa/50">{result.detail}</p>
      ) : null}
      {result.href ? (
        <Link
          className="mt-3 inline-block rounded-full border border-white/70 bg-white/62 px-4 py-1.5 text-xs font-medium text-sage shadow-sm hover:bg-white/80 transition"
          href={result.href}
        >
          去看看
        </Link>
      ) : null}
    </section>
  );
}