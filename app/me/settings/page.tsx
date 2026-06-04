"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { ThemeStylePicker } from "@/components/settings/ThemeStylePicker";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { useFixedAppIdentity } from "@/hooks/useFixedAppIdentity";
import { getAppSideLabel } from "@/lib/appIdentity";
import { useAccessibleMotion, safeVariants, fadeInScale, safeTransition } from "@/lib/design/motion";

export default function MeSettingsPage() {
  const { appSide } = useFixedAppIdentity();
  const sideLabel = getAppSideLabel(appSide);
  const reduceMotion = useAccessibleMotion();

  return (
    <AppShell>
      <motion.header
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-sage/30 via-cream/80 to-skySoft/40 p-5 shadow-float backdrop-blur-xl"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Settings</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">我端设置</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          当前使用：{sideLabel}端 · 你在这里发布、评论和点赞，都会以{sideLabel}的身份记录。
        </p>
      </motion.header>

      <div className="space-y-4">
        {/* My side info */}
        <AppCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--app-text)]">当前使用：{sideLabel}端</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">这是你自己的空间。所有操作都会以你的身份进行记录。</p>
            </div>
            <Badge variant="secondary" className="bg-skySoft text-cocoa">{sideLabel}</Badge>
          </div>
        </AppCard>

        {/* Quick links to management */}
        <AppCard>
          <h3 className="mb-3 text-sm font-semibold text-cocoa">⚙ 管理中心</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/me/admin" className="btn-secondary btn-small">数据维护</Link>
            <Link href="/me/admin" className="btn-secondary btn-small">评论管理</Link>
            <Link href="/me/admin" className="btn-secondary btn-small">备份导出</Link>
          </div>
          <p className="mt-3 text-xs text-[var(--app-muted)] leading-relaxed">
            整理数据、备份和查看评论，都在管理中心。
          </p>
        </AppCard>

        {/* Notification settings */}
        <SettingsSection title="通知">
          <NotificationSettingsCard />
        </SettingsSection>

        {/* Cloud sync status */}
        <SettingsSection title="云同步">
          <SyncStatusCard />
        </SettingsSection>

        {/* Theme picker */}
        <SettingsSection title="主题">
          <ThemeStylePicker currentStyle="soft" onSelect={() => {}} />
        </SettingsSection>

        {/* Local data note */}
        <AppCard>
          <h3 className="mb-2 text-sm font-semibold text-cocoa">数据存储说明</h3>
          <p className="text-xs text-[var(--app-muted)] leading-relaxed">
            你的已读状态、互动偏好等保存在本设备上，换设备后可能需要重新设置。备份和云端数据会跨设备同步。
          </p>
        </AppCard>
      </div>
    </AppShell>
  );
}