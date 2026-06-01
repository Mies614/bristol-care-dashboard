"use client";

import Link from "next/link";
import type { NextImportantResult } from "@/components/TodayCareSummary";

/**
 * NextImportantCard
 *
 * 首页顶部第二个卡片，展示“下一件重要事项”。
 * 风格比 TodaySummaryCard 更紧凑，一行内显示完整信息。
 */
export function NextImportantCard({ result }: { result: NextImportantResult }) {
  const emoji =
    result.type === "course" ? "📚" :
    result.type === "deadline" ? "📌" :
    result.type === "period" ? "🌸" : "✨";

  const bgClass =
    result.type === "course" ? "from-skySoft/55 to-white/80" :
    result.type === "deadline" ? "from-amber-100/45 to-white/80" :
    result.type === "period" ? "from-blush/50 to-white/80" :
    "from-white/75 to-white/80";

  return (
    <section className={`soft-card bg-gradient-to-br ${bgClass}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/65 text-xl shadow-sm">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sage">{result.label}</p>
            <span className="text-[11px] text-cocoa/45">·</span>
            <p className="text-[13px] font-semibold text-cocoa truncate">{result.title}</p>
          </div>
          {result.detail ? (
            <p className="mt-0.5 text-[11px] leading-5 text-cocoa/55 truncate">{result.detail}</p>
          ) : null}
        </div>
        {result.href ? (
          <Link
            className="shrink-0 rounded-full border border-white/70 bg-white/62 px-2.5 py-0.5 text-[11px] font-medium text-sage shadow-sm hover:bg-white/80 transition"
            href={result.href}
          >
            去看看
          </Link>
        ) : null}
      </div>
    </section>
  );
}