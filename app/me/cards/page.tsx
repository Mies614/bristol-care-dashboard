"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionTile } from "@/components/ui/ActionTile";
import { StatusPill } from "@/components/ui/StatusPill";
import { AppCard } from "@/components/ui/AppCard";

export default function MeCardsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="我的卡夹"
          subtitle="常用卡放在这里，管理便利。"
          action={<StatusPill variant="owner">我端</StatusPill>}
        />

        <div className="space-y-2">
          <ActionTile
            title="会员卡夹"
            description="管理会员卡、积分卡和优惠券。"
            icon="💳"
            href="/me/cards"
          />
        </div>

        {/* Admin center entry — owner-only */}
        <AppCard variant="highlight">
          <h3 className="mb-3 text-sm font-semibold text-cocoa">管理中心</h3>
          <div className="space-y-2">
            <ActionTile
              title="数据维护"
              description="整理数据、备份和查看评论。"
              icon="⚙️"
              href="/me/admin"
            />
          </div>
          <p className="mt-3 text-xs text-[var(--app-muted)] leading-relaxed">
            整理数据、备份和查看评论，都在管理中心。这里只有你能看到。
          </p>
        </AppCard>
      </div>
    </AppShell>
  );
}
