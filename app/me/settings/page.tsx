"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionTile } from "@/components/ui/ActionTile";
import { StatusPill } from "@/components/ui/StatusPill";
import { AppCard } from "@/components/ui/AppCard";
import { AppSection } from "@/components/ui/AppSection";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { SyncStatusPanel } from "@/components/settings/SyncStatusPanel";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { ThemeGallery } from "@/components/settings/ThemeGallery";
import { useAccessibleMotion, safeVariants, fadeInScale, safeTransition } from "@/lib/design/motion";
import { getThemeSettings, saveThemeSettings } from "@/lib/theme";
import { useState } from "react";

export default function MeSettingsPage() {
  const reduceMotion = useAccessibleMotion();
  const [currentThemeStyle, setCurrentThemeStyle] = useState(getThemeSettings("me").style);
  const handleThemeSelect = (style: typeof currentThemeStyle) => {
    const settings = getThemeSettings("me");
    saveThemeSettings({ ...settings, style }, "me");
    setCurrentThemeStyle(style);
  };

  return (
    <AppShell>
      <motion.header
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-sage/30 via-cream/80 to-skySoft/40 p-5 shadow-float backdrop-blur-xl"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <PageHeader
          title="我的设置"
          subtitle="这里是我的管理入口，可以整理内容、备份数据和查看同步状态。"
          action={<StatusPill variant="owner">我端</StatusPill>}
        />
      </motion.header>

      <div className="space-y-4">
        {/* Current perspective */}
        <AppCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--app-text)]">当前视角</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                你看到的是我端内容。评论、喜欢和已读会按 me 身份记录。
              </p>
            </div>
            <StatusPill variant="owner">我端</StatusPill>
          </div>
        </AppCard>

        {/* Admin center */}
        <AppCard variant="highlight">
          <h3 className="mb-3 text-sm font-semibold text-cocoa">管理中心</h3>
          <div className="space-y-2">
            <ActionTile
              title="数据维护"
              description="整理内容、备份数据和检查同步。"
              href="/me/admin"
            />
          </div>
          <p className="mt-3 text-xs text-[var(--app-muted)] leading-relaxed">
            整理数据、备份和查看评论，都在管理中心。危险操作需要确认后才会执行。
          </p>
        </AppCard>

        {/* Sync status */}
        <AppSection title="同步状态" variant="card">
          <SyncStatusCard />
          <SyncStatusPanel showAdvanced />
        </AppSection>

        {/* Notification settings */}
        <AppSection title="通知" variant="card">
          <NotificationSettingsCard />
        </AppSection>

        {/* Theme picker */}
        <AppSection title="主题" variant="card">
          <ThemeGallery currentStyle={currentThemeStyle} onSelect={handleThemeSelect} showLabels />
        </AppSection>

        {/* Data storage note */}
        <AppCard>
          <h3 className="mb-2 text-sm font-semibold text-cocoa">数据存储说明</h3>
          <p className="text-xs text-[var(--app-muted)] leading-relaxed">
            你的已读状态、互动偏好等保存在本设备上，换设备后可能需要重新设置。
            备份和云端数据会跨设备同步。
          </p>
        </AppCard>
      </div>
    </AppShell>
  );
}
