"use client";

import { useEffect, useState } from "react";
import { getBristolAndBeijingTime } from "@/lib/timeZones";

export function DualTimeCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const times = getBristolAndBeijingTime(now);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1.35rem] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-2 shadow-sm backdrop-blur-xl">
      {[times.bristol, times.beijing].map((item) => (
        <div className="rounded-[1rem] bg-white/45 px-3 py-2 text-sm text-cocoa/70" key={item.label}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sage">{item.label}</p>
          <p className="mt-1 text-lg font-semibold text-cocoa">{item.dayLabel === "今天" ? item.time : `${item.dayLabel} ${item.time}`}</p>
        </div>
      ))}
    </div>
  );
}
