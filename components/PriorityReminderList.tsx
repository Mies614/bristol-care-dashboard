import { PriorityReminderCard } from "./PriorityReminderCard";
import type { PriorityReminder } from "@/lib/priorityReminders";

export function PriorityReminderList({
  reminders,
  limit,
  empty = "今天暂时没有特别紧急的提醒。"
}: {
  reminders: PriorityReminder[];
  limit?: number;
  empty?: string;
}) {
  const visible = typeof limit === "number" ? reminders.slice(0, limit) : reminders;
  if (!visible.length) return <p className="empty-state text-left">{empty}</p>;
  return (
    <div className="space-y-2">
      {visible.map((reminder) => (
        <PriorityReminderCard compact={limit !== undefined} key={reminder.id} reminder={reminder} />
      ))}
    </div>
  );
}
