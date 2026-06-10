"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionTile } from "@/components/ui/ActionTile";
import { StatusPill } from "@/components/ui/StatusPill";
import { getSideHref } from "@/lib/navigation";

const OWNER_TILES = [
  {
    title: "写给小乖",
    description: "留一张新的小纸条。",
    href: getSideHref("owner", "/notes"),
    icon: "💌",
  },
  {
    title: "课程",
    description: "整理课程和安排。",
    href: getSideHref("owner", "/courses"),
    icon: "📚",
  },
  {
    title: "DDL",
    description: "查看重要提醒。",
    href: getSideHref("owner", "/deadlines"),
    icon: "📋",
  },
  {
    title: "经期",
    description: "查看和维护身体状态提醒。",
    href: getSideHref("owner", "/period"),
    icon: "🌸",
  },
];

export default function MeRecordsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="我的记录"
          subtitle="写给小乖，也整理今天要处理的事。"
          action={<StatusPill variant="owner">我端</StatusPill>}
        />

        <div className="space-y-2">
          {OWNER_TILES.map((tile) => (
            <ActionTile
              key={tile.href}
              title={tile.title}
              description={tile.description}
              icon={tile.icon}
              href={tile.href}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
