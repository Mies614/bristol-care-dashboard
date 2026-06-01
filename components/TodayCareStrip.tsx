"use client";

import Link from "next/link";

export type CareStripItem = {
  /** 唯一标识，用于 key */
  id: string;
  /** emoji 图标 */
  icon: string;
  /** 标签 */
  label: string;
  /** 简短摘要 */
  summary: string;
  /** 跳转链接 */
  href?: string;
};

interface TodayCareStripProps {
  items: CareStripItem[];
}

/**
 * TodayCareStrip
 *
 * 首页紧凑横向摘要条，展示 2-4 个今日照顾关键信息。
 * 替代之前的长列表 TodayCareSummary。
 */
export function TodayCareStrip({ items }: TodayCareStripProps) {
  if (items.length === 0) return null;

  return (
    <section className="soft-card">
      <p className="section-kicker mb-1">Today Care</p>
      <h2 className="font-semibold text-cocoa mb-3">今日照顾</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={item.href || "#"}
            className="flex flex-col gap-1 rounded-2xl bg-white/55 p-3 transition hover:bg-white/80 hover:shadow-sm"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-semibold text-cocoa/60">{item.label}</span>
            <span className="text-xs leading-5 text-cocoa/70 line-clamp-2">{item.summary}</span>
          </Link>
        ))}
      </div>
      <Link className="mt-3 inline-block text-xs text-sage hover:underline" href="/records">
        更多详情 →
      </Link>
    </section>
  );
}