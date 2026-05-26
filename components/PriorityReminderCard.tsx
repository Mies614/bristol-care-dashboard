import Link from "next/link";
import type { PriorityReminder } from "@/lib/priorityReminders";

const toneClass: Record<PriorityReminder["priority"], string> = {
  urgent: "border-[#efb6a6]/80 bg-gradient-to-br from-[#fff0ed]/95 to-butter/65 shadow-float",
  soon: "border-[#f3d391]/80 bg-gradient-to-br from-butter/75 to-blush/55 shadow-soft",
  normal: "border-white/75 bg-white/72 shadow-soft",
  info: "border-white/70 bg-white/55 shadow-sm"
};

const typeLabel: Record<PriorityReminder["type"], string> = {
  course: "课程",
  deadline: "DDL",
  period: "经期"
};

export function PriorityReminderCard({ reminder, compact = false }: { reminder: PriorityReminder; compact?: boolean }) {
  return (
    <Link className={`block rounded-[1.45rem] border p-3 backdrop-blur-xl transition hover:-translate-y-0.5 ${toneClass[reminder.priority]} ${reminder.priority === "urgent" && !compact ? "p-4" : ""}`} href={reminder.href}>
      <div className="flex items-start gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-sm ${reminder.priority === "urgent" && !compact ? "h-12 w-12 text-xl" : "h-10 w-10"}`}>
          {reminder.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/62 px-2 py-0.5 text-[11px] font-medium text-cocoa/62">{typeLabel[reminder.type]}</span>
            <span className="rounded-full bg-cocoa/8 px-2 py-0.5 text-[11px] font-medium uppercase text-cocoa/52">{reminder.priority}</span>
          </div>
          <h3 className="mt-1 font-semibold leading-6 text-cocoa">{reminder.title}</h3>
          {reminder.subtitle ? <p className="mt-1 text-sm leading-5 text-cocoa/68">{reminder.subtitle}</p> : null}
        </div>
      </div>
    </Link>
  );
}
