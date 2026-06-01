"use client";

import Link from "next/link";

export type CareStripItem = {
  /** 唯一标识，用于 key */
  id: string;
  /** emoji 图标 */
  icon: string;
  /** 标签 */
  label: string;
  /** 数字或简短值 */
  value: string;
  /** 跳转链接 */
  href?: string;
};

interface TodayCareStripProps {
  items: CareStripItem[];
}

/**
 * TodayCareStrip
 *
 * 首页紧凑横向状态行，展示 3-4 个今日关键数字。
 * 每格只显示 emoji + 数字 + 标签，不展示详细文字。
 * 宽度自适应，支持 390px 不换行。
 */
export function TodayCareStrip({ items }: TodayCareStripProps) {
  if (items.length === 0) return null;

  return (
    <section className="soft-card py-2.5 md:py-3">
      <div className="flex justify-around gap-1">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={item.href || "#"}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/55 px-2 py-1.5 min-w-0 flex-1 transition hover:bg-white/80 hover:shadow-sm"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-sm font-bold text-cocoa leading-tight tabular-nums">{item.value}</span>
            <span className="text-[10px] font-medium text-cocoa/45 leading-tight text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}