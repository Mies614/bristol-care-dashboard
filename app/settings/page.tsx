"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { downloadJson, readJsonFile } from "@/components/JsonImportExport";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { PageHeader } from "@/components/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { ThemeStylePicker } from "@/components/settings/ThemeStylePicker";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AppCard } from "@/components/ui/AppCard";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  getBackgroundOverlayStyle,
  getBackgroundSettings,
  getBackgroundStyle,
  saveBackgroundSettings,
} from "@/lib/background";
import { uploadBackgroundImageDirectly, validateBackgroundImageFile } from "@/lib/backgroundUpload";
import {
  clearCloudConnection,
  getCloudConnection,
  getDefaultSpaceCode,
  getLastSyncTime,
  getSpaceByCode,
  isCloudConfigured,
  pullAndPersistCloudData,
  saveCloudConnection,
  setLastSyncTime,
  uploadLocalDataToCloud,
} from "@/lib/cloudSync";
import { markLocalChange, runAutoSyncNow, scheduleAutoSync, getPendingSyncState, clearPendingSyncState } from "@/lib/autoSync";
import { loadAppData, resetAppData, saveAppData } from "@/lib/storage";
import { DEFAULT_THEME_SETTINGS, getThemeDefaultsForStyle, getThemeSettings, saveThemeSettings } from "@/lib/theme";
import type { AppData, BackgroundSettings, ThemeSettings } from "@/lib/types";
import { validateAppData } from "@/lib/validation";

export default function SettingsPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [cloudCode, setCloudCode] = useState(getDefaultSpaceCode());
  const [cloudMessage, setCloudMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState("");
  const [colorDraft, setColorDraft] = useState("#fff8f0");
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const current = loadAppData();
    const background = getBackgroundSettings();
    const theme = getThemeSettings();
    setData({ ...current, backgroundSettings: background, themeSettings: theme });
    setColorDraft(background.color || "#fff8f0");
    setImageUrlDraft(background.imageUrl || "");
    const connection = getCloudConnection();
    if (connection) setCloudCode(connection.code);
    setLastSync(getLastSyncTime());
    const state = getPendingSyncState();
    if (state.lastError) setSyncError(state.lastError);
  }, []);

  const counts = useMemo(() => ({
    courses: data?.courses.length || 0,
    deadlines: data?.deadlines.length || 0,
    loveNotes: data?.loveNotes.length || 0,
  }), [data]);

  function update(next: AppData) {
    saveAppData(next);
    setData(next);
    setImportMessage("");
  }

  function updateBackground(next: BackgroundSettings) {
    if (!data) return;
    const saved = saveBackgroundSettings(next);
    update({ ...data, backgroundSettings: saved });
  }

  function updateTheme(next: ThemeSettings) {
    if (!data) return;
    const saved = saveThemeSettings(next);
    update({ ...data, themeSettings: saved });
  }

  function updateThemePartial(partial: Partial<ThemeSettings>) {
    if (!data) return;
    updateTheme({ ...data.themeSettings, ...partial });
  }

  function updateBackgroundPartial(partial: Partial<BackgroundSettings>) {
    if (!data) return;
    updateBackground({ ...data.backgroundSettings, ...partial });
  }

  async function connectCloud() {
    setCloudMessage("");
    const result = await getSpaceByCode(cloudCode.trim());
    if (!result.ok) {
      setCloudMessage(result.error || "云同步连接失败。");
      return;
    }
    saveCloudConnection(cloudCode.trim());
    setCloudMessage(`已连接 ${cloudCode.trim()}。`);
  }

  async function pullCloud() {
    if (!confirm("这会用云端数据覆盖当前设备数据，建议先导出 JSON 备份。确定继续吗？")) return;
    const result = await pullAndPersistCloudData(cloudCode.trim());
    if (result.ok && result.data) {
      setData(result.data);
      setLastSync(getLastSyncTime());
      setCloudMessage("已从云端恢复到本地。");
    } else {
      setCloudMessage(result.error || "从云端恢复失败，本地数据已保留。");
    }
  }

  async function uploadCloud() {
    if (!data) return;
    if (!confirm("这会用当前设备的数据覆盖云端数据，建议先导出 JSON 备份。确定继续吗？")) return;
    const result = await uploadLocalDataToCloud(cloudCode.trim(), data);
    if (result.ok) {
      setLastSyncTime();
      setLastSync(getLastSyncTime());
      setCloudMessage("本地数据已上传到云端。");
    } else {
      setCloudMessage([result.error || "上传失败，本地数据已保留。", result.code ? `code: ${result.code}` : "", result.step ? `step: ${result.step}` : "", result.detail ? `detail: ${result.detail}` : ""].filter(Boolean).join(" · "));
    }
  }

  async function manualSync() {
    setSyncing(true);
    setCloudMessage("");
    setSyncError("");
    try {
      await runAutoSyncNow("manual");
      setLastSync(getLastSyncTime());
      const state = getPendingSyncState();
      if (state.lastError) setSyncError(state.lastError);
      setCloudMessage(state.status === "synced" || !state.pending ? "同步成功。" : "同步中，稍后生效。");
    } catch {
      setCloudMessage("同步失败。");
    } finally {
      setSyncing(false);
    }
  }

  async function manualRetry() {
    setSyncing(true);
    setCloudMessage("");
    setSyncError("");
    try {
      await runAutoSyncNow("manual_retry");
      setLastSync(getLastSyncTime());
      const state = getPendingSyncState();
      if (state.lastError) setSyncError(state.lastError);
      setCloudMessage(state.status === "synced" ? "同步成功。" : "已重试，检查下方状态。");
    } catch {
      setCloudMessage("重试失败。");
    } finally {
      setSyncing(false);
    }
  }

  async function clearSyncError() {
    clearPendingSyncState();
    setSyncError("");
    setCloudMessage("同步错误已清除。");
  }

  if (!data) return <AppShell><AppCard className="text-center py-12 text-[var(--app-muted)]">正在加载设置...</AppCard></AppShell>;

  return (
    <AppShell>
      <PageHeader title="设置" subtitle="这里管理外观、背景、云同步和数据。" />

      <div className="flex w-full min-w-0 flex-col gap-4">
        {/* ──────────────────── 1. Identity ──────────────────── */}
        <SettingsSection title="小乖端" subtitle="这里是小乖的小空间">
          <div className="rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
            <p className="text-sm font-semibold text-cocoa">当前使用：小乖端</p>
            <p className="mt-1.5 text-xs text-[var(--app-muted)] leading-relaxed">这里是小乖的小空间。小纸条、点赞和评论都会以&ldquo;小乖&rdquo;的身份留下。</p>
            <p className="mt-2 text-xs text-[var(--app-muted)]">已读状态只保存在这台设备上，换设备后可能需要重新看一遍。</p>
          </div>
        </SettingsSection>

        {/* ──────────────────── 2. Profile - 日常最常用 ──────────────────── */}
        <SettingsSection title="常用设置" subtitle="昵称、见面日期和备注">
          <label className="block text-sm text-[var(--app-muted)]">
            昵称
            <Input className="mt-1" value={data.nickname || "小乖"} onChange={(e) => update({ ...data, nickname: e.target.value || "小乖" })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            下次见面日期
            <Input className="mt-1" type="date" value={data.nextMeetDate} onChange={(e) => update({ ...data, nextMeetDate: e.target.value })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            学期结束日期
            <Input className="mt-1" type="date" value={data.semesterEndDate || ""} onChange={(e) => update({ ...data, semesterEndDate: e.target.value })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            本地小纸条 fallback
            <Textarea className="mt-1 min-h-28" value={data.note} onChange={(e) => update({ ...data, note: e.target.value })} />
          </label>
        </SettingsSection>

        {/* ──────────────────── 3. Appearance / Theme ──────────────────── */}
        <SettingsSection title="外观风格" subtitle="主题和卡片样式">
          <ThemeStylePicker
            currentStyle={data.themeSettings.style}
            onSelect={(style) => updateTheme(getThemeDefaultsForStyle(style))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-[var(--app-muted)]">
              卡片样式
              <select className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]" value={data.themeSettings.cardStyle} onChange={(e) => updateThemePartial({ cardStyle: e.target.value as ThemeSettings["cardStyle"] })}>
                <option value="glass">玻璃</option>
                <option value="solid">实色</option>
                <option value="paper">纸张</option>
                <option value="flat">扁平</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              底部导航
              <select className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]" value={data.themeSettings.navStyle} onChange={(e) => updateThemePartial({ navStyle: e.target.value as ThemeSettings["navStyle"] })}>
                <option value="glass">玻璃</option>
                <option value="pill">胶囊</option>
                <option value="paper">纸张</option>
                <option value="minimal">极简</option>
                <option value="floating">浮动</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              圆角
              <select className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]" value={data.themeSettings.radius} onChange={(e) => updateThemePartial({ radius: e.target.value as ThemeSettings["radius"] })}>
                <option value="medium">中</option>
                <option value="large">大</option>
                <option value="extra">超大</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              装饰
              <select className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]" value={data.themeSettings.decoration} onChange={(e) => updateThemePartial({ decoration: e.target.value as ThemeSettings["decoration"] })}>
                <option value="none">无</option>
                <option value="stars">星星</option>
                <option value="hearts">爱心</option>
                <option value="tape">胶带</option>
                <option value="moon">月亮</option>
              </select>
            </label>
          </div>
          <AppCard compact className="shadow-sm">
            <p className="text-sm font-semibold text-[var(--app-text)] mb-2">Preview</p>
            <div className="rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-3 shadow-sm">
              <p className="font-semibold text-[var(--app-text)]">示例卡片</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">风格会同步影响全站组件。</p>
              <AppButton variant="primary" size="sm" className="mt-3">示例按钮</AppButton>
            </div>
            <div className="mt-3 rounded-2xl border bg-[var(--app-nav-bg)] p-2 text-center text-sm text-[var(--app-muted)]">底部导航预览 · 首页 / 记录 / 回忆</div>
          </AppCard>
          <AppButton variant="secondary" className="w-full" onClick={() => updateTheme(DEFAULT_THEME_SETTINGS)}>恢复默认风格</AppButton>
        </SettingsSection>

        {/* ──────────────────── 4. Background ──────────────────── */}
        <SettingsSection title="背景" subtitle="上传背景图后会同步到云端">
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--app-muted)]">预设背景</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["cream", "奶油白"],
                ["pink", "淡粉"],
                ["lavender", "浅紫"],
                ["blue", "浅蓝"],
                ["green", "浅绿"],
                ["dark", "深色"],
              ].map(([preset, label]) => (
                <button
                  className={`rounded-2xl border px-3 py-3 text-sm shadow-sm transition ${
                    data.backgroundSettings.preset === preset && data.backgroundSettings.mode === "preset"
                      ? "border-roseSoft bg-blush/75 text-[var(--app-text)]"
                      : "border-white/75 bg-white/65 text-[var(--app-muted)]"
                  }`}
                  key={preset}
                  onClick={() => updateBackground({ ...data.backgroundSettings, mode: "preset", preset: preset as BackgroundSettings["preset"] })}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-[var(--app-muted)]">
              自定义颜色
              <div className="mt-1 flex gap-2">
                <input
                  className="h-12 w-16 shrink-0 rounded-2xl border border-white/80 bg-white/80 p-1"
                  type="color"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                />
                <Input
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                />
              </div>
              <AppButton variant="secondary" size="sm" className="mt-2" onClick={() => updateBackground({ ...data.backgroundSettings, mode: "color", color: colorDraft })}>
                应用颜色
              </AppButton>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              远程图片 URL
              <Input
                className="mt-1"
                placeholder="https://..."
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
              />
              <AppButton variant="secondary" size="sm" className="mt-2" onClick={() => updateBackground({ ...data.backgroundSettings, mode: "url", imageUrl: imageUrlDraft })}>
                应用 URL
              </AppButton>
            </label>
          </div>

          <label className="block rounded-[var(--app-radius)] border border-dashed border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm cursor-pointer hover:border-[var(--app-accent)] transition">
            <span className="font-medium text-[var(--app-text)]">上传云端背景图片</span>
            <span className="mt-1 block text-xs text-[var(--app-muted)]">JPG / PNG / WebP / HEIC / HEIF，最大 30MB</span>
            <Input
              className="mt-3 block w-full cursor-pointer"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                const validation = validateBackgroundImageFile(file);
                if (!validation.ok) {
                  setImportMessage(validation.error || "图片不符合要求。");
                  input.value = "";
                  return;
                }
                try {
                  setImportMessage("正在上传背景图片...");
                  const upload = await uploadBackgroundImageDirectly(file, cloudCode.trim() || getDefaultSpaceCode());
                  updateBackground({
                    ...data.backgroundSettings,
                    mode: "cloudImage",
                    imageDataUrl: undefined,
                    cloudImageUrl: upload.url,
                    cloudImagePath: upload.path,
                    imageFit: "softPortrait",
                    imagePosition: "top",
                    focalPoint: { x: 50, y: 35 },
                    overlay: "medium",
                    dim: 35,
                    scale: 105,
                    blur: false,
                    portraitEnhance: true,
                  });
                  setImportMessage("背景图片已上传并应用。");
                  runAutoSyncNow("background_cloud_image").catch(() => {
                    markLocalChange("background");
                    scheduleAutoSync("background_cloud_image");
                  });
                } catch (error) {
                  setImportMessage(error instanceof Error ? error.message : "背景图片上传失败。");
                } finally {
                  input.value = "";
                }
              }}
            />
          </label>

          <AppCard compact className="shadow-sm">
            <p className="mb-2 text-xs font-medium text-[var(--app-muted)]">实时预览</p>
            <div className="relative h-32 overflow-hidden rounded-2xl border border-white/70" style={getBackgroundStyle(data.backgroundSettings)}>
              <div className="absolute inset-0" style={getBackgroundOverlayStyle(data.backgroundSettings)} />
              <div className="relative z-10 flex h-full items-end p-3">
                <div className="rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-[var(--app-text)] shadow-sm backdrop-blur">
                  Bristol Care<br />背景预览
                </div>
              </div>
            </div>
          </AppCard>

          {importMessage ? <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">{importMessage}</div> : null}

          {(data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl || data.backgroundSettings.cloudImageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="背景预览"
              className="max-h-48 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] object-cover shadow-sm"
              src={data.backgroundSettings.cloudImageUrl || data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl}
            />
          ) : null}

          <AppCard compact className="shadow-sm space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--app-text)]">人物照片优化</p>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">如果用人物照片做背景，可以试试&ldquo;人物照片&rdquo;或&ldquo;柔和人物背景&rdquo;。</p>
            </div>
            <label className="block text-sm text-[var(--app-muted)]">
              背景显示模式
              <select
                className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                value={data.backgroundSettings.imageFit || "cover"}
                onChange={(e) => {
                  const imageFit = e.target.value as BackgroundSettings["imageFit"];
                  if (imageFit === "portrait") {
                    updateBackgroundPartial({ imageFit, imagePosition: "top", focalPoint: { x: 50, y: 35 }, dim: Math.max(data.backgroundSettings.dim || 20, 28), portraitEnhance: true });
                    return;
                  }
                  if (imageFit === "softPortrait") {
                    updateBackgroundPartial({ imageFit, imagePosition: "top", focalPoint: { x: 50, y: 35 }, overlay: "medium", dim: Math.max(data.backgroundSettings.dim || 20, 36), scale: Math.max(data.backgroundSettings.scale || 100, 105), portraitEnhance: true });
                    return;
                  }
                  updateBackgroundPartial({ imageFit, portraitEnhance: false });
                }}
              >
                <option value="cover">普通铺满</option>
                <option value="contain">完整显示</option>
                <option value="portrait">人物照片</option>
                <option value="softPortrait">柔和人物背景</option>
              </select>
            </label>
            <div>
              <p className="mb-2 text-sm text-[var(--app-muted)]">焦点位置</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["居中", { x: 50, y: 50 }, "center"],
                  ["靠上", { x: 50, y: 28 }, "top"],
                  ["靠下", { x: 50, y: 74 }, "bottom"],
                  ["偏左", { x: 28, y: 45 }, "left"],
                  ["偏右", { x: 72, y: 45 }, "right"],
                ].map(([label, focalPoint, imagePosition]) => (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    key={String(label)}
                    onClick={() => updateBackgroundPartial({ focalPoint: focalPoint as BackgroundSettings["focalPoint"], imagePosition: imagePosition as BackgroundSettings["imagePosition"] })}
                  >
                    {String(label)}
                  </AppButton>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[var(--app-muted)]">
                焦点 X：{data.backgroundSettings.focalPoint?.x ?? 50}%
                <input
                  className="mt-2 w-full accent-[var(--app-accent)]"
                  max={100}
                  min={0}
                  type="range"
                  value={data.backgroundSettings.focalPoint?.x ?? 50}
                  onChange={(e) => updateBackgroundPartial({ focalPoint: { x: Number(e.target.value), y: data.backgroundSettings.focalPoint?.y ?? 38 } })}
                />
              </label>
              <label className="block text-sm text-[var(--app-muted)]">
                焦点 Y：{data.backgroundSettings.focalPoint?.y ?? 38}%
                <input
                  className="mt-2 w-full accent-[var(--app-accent)]"
                  max={100}
                  min={0}
                  type="range"
                  value={data.backgroundSettings.focalPoint?.y ?? 38}
                  onChange={(e) => updateBackgroundPartial({ focalPoint: { x: data.backgroundSettings.focalPoint?.x ?? 50, y: Number(e.target.value) } })}
                />
              </label>
              <label className="block text-sm text-[var(--app-muted)]">
                背景遮罩：{data.backgroundSettings.dim ?? 20}%
                <input
                  className="mt-2 w-full accent-[var(--app-accent)]"
                  max={80}
                  min={0}
                  type="range"
                  value={data.backgroundSettings.dim ?? 20}
                  onChange={(e) => updateBackgroundPartial({ dim: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm text-[var(--app-muted)]">
                背景缩放：{data.backgroundSettings.scale ?? 100}%
                <input
                  className="mt-2 w-full accent-[var(--app-accent)]"
                  max={130}
                  min={90}
                  type="range"
                  value={data.backgroundSettings.scale ?? 100}
                  onChange={(e) => updateBackgroundPartial({ scale: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[var(--app-muted)]">
                兼容遮罩
                <select
                  className="mt-1 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                  value={data.backgroundSettings.overlay || "light"}
                  onChange={(e) => updateBackgroundPartial({ overlay: e.target.value as BackgroundSettings["overlay"] })}
                >
                  <option value="none">无</option>
                  <option value="light">浅</option>
                  <option value="medium">中</option>
                  <option value="strong">强</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
                <input checked={Boolean(data.backgroundSettings.blur)} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => updateBackgroundPartial({ blur: e.target.checked })} />
                <span className="text-sm text-[var(--app-text)]">柔化背景</span>
              </label>
              <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer sm:col-span-2">
                <input checked={Boolean(data.backgroundSettings.portraitEnhance)} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => updateBackgroundPartial({ portraitEnhance: e.target.checked, dim: e.target.checked ? Math.max(data.backgroundSettings.dim || 20, 35) : data.backgroundSettings.dim })} />
                <span className="text-sm text-[var(--app-text)]">人物照片优化</span>
              </label>
            </div>
          </AppCard>

          <AppButton variant="secondary" className="w-full" onClick={() => { setColorDraft("#fff8f0"); setImageUrlDraft(""); updateBackground(DEFAULT_BACKGROUND_SETTINGS); }}>
            恢复默认背景
          </AppButton>
        </SettingsSection>

        {/* ──────────────────── 5. Cloud Sync ──────────────────── */}
        <SettingsSection title="云同步" subtitle="同步状态、手动操作和错误诊断">
          <div className="space-y-1">
            <AutoSyncStatusBadge />
          <SyncStatusCard />
          </div>
          {lastSync ? (
            <p className="text-xs text-[var(--app-muted)]">最近同步：{new Date(lastSync).toLocaleString("zh-CN")}</p>
          ) : (
            <p className="text-xs text-[var(--app-muted)]">尚未同步过</p>
          )}
          {syncError ? (
            <details className="mt-2 rounded-[var(--app-radius)] border border-amber-200 bg-amber-50/80 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-amber-700 text-xs">⚠ 最近同步错误（点击展开）</summary>
              <p className="mt-2 text-xs text-amber-800 break-words whitespace-pre-wrap max-h-32 overflow-auto">{syncError}</p>
              <div className="mt-2 flex gap-2">
                <AppButton variant="secondary" size="sm" onClick={manualRetry} disabled={syncing}>
                  {syncing ? "重试中..." : "🔄 手动重试"}
                </AppButton>
                <AppButton variant="secondary" size="sm" onClick={clearSyncError}>
                  清除记录
                </AppButton>
              </div>
            </details>
          ) : null}
          <div className="flex flex-wrap gap-2 rounded-[var(--app-radius)] border border-white/70 bg-white/55 p-3 shadow-sm mt-2">
            <Badge variant="outline">课程 {counts.courses}</Badge>
            <Badge variant="outline">Deadline {counts.deadlines}</Badge>
            <Badge variant="outline">小纸条 {counts.loveNotes}</Badge>
            <Badge variant="outline">经期记录 {data.periodRecords?.length || 0}</Badge>
          </div>
          <label className="block text-sm text-[var(--app-muted)] mt-3">
            访问码
            <Input className="mt-1" value={cloudCode} onChange={(e) => setCloudCode(e.target.value)} />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-2">
            <AppButton variant="secondary" className="w-full" onClick={connectCloud} disabled={!isCloudConfigured()}>连接云同步</AppButton>
            {isCloudConfigured() ? (
              <>
                <AppButton variant="secondary" className="w-full" onClick={manualSync}>手动同步</AppButton>
                <AppButton variant="secondary" className="w-full" onClick={uploadCloud}>上传本地到云端</AppButton>
                <AppButton variant="secondary" className="w-full" onClick={pullCloud}>从云端恢复</AppButton>
              </>
            ) : null}
          </div>
          {isCloudConfigured() ? (
            <AppButton variant="danger" className="w-full mt-2" onClick={() => { clearCloudConnection(); setLastSync(null); setSyncError(""); setCloudMessage("已关闭云同步。"); }}>关闭云同步</AppButton>
          ) : null}
          {cloudMessage ? (
            <details className="mt-2 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)] break-words whitespace-pre-wrap">
              <summary className="cursor-pointer font-medium">同步消息（点击展开）</summary>
              <p className="mt-2">{cloudMessage}</p>
            </details>
          ) : null}
        </SettingsSection>

        {/* ──────────────────── 6. Local Data ──────────────────── */}
        <SettingsSection title="本地数据" subtitle="导出、导入和重置" defaultOpen={false}>
          <div className="rounded-[var(--app-radius)] border border-[var(--app-danger)]/25 bg-[var(--app-danger)]/6 p-3 text-sm text-[var(--app-text)]">
            <p className="font-medium">⚠️ 危险操作区</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">导入和重置会覆盖当前本地数据，操作前建议先导出 JSON 备份。</p>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-3">
            <AppButton variant="secondary" className="w-full" onClick={() => downloadJson("bristol-care-data.json", data)}>📥 导出全部 JSON</AppButton>
            <label className="cursor-pointer block">
              <AppButton variant="secondary" className="w-full" onClick={() => {}}>📤 导入全部 JSON</AppButton>
              <Input
                className="hidden"
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    update(validateAppData(await readJsonFile<unknown>(file)));
                    setImportMessage("完整数据导入成功。");
                  } catch (error) {
                    setImportMessage(error instanceof Error ? error.message : "完整数据导入失败。");
                  } finally {
                    e.currentTarget.value = "";
                  }
                }}
              />
            </label>
            <AppButton variant="danger" className="w-full" onClick={() => { resetAppData(); setData(loadAppData()); }}>
              🗑 重置所有本地数据
            </AppButton>
          </div>
          {importMessage ? <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">{importMessage}</div> : null}
        </SettingsSection>

        {/* ──────────────────── 7. Notifications ──────────────────── */}
        <SettingsSection title="通知" subtitle="推送通知和每日关怀提醒" defaultOpen={false}>
          <NotificationSettingsCard />
        </SettingsSection>

        {/* ──────────────────── 8. Advanced ──────────────────── */}
        <SettingsSection title="高级" subtitle="同步频率和自动同步偏好" defaultOpen={false}>
          <p className="text-xs text-[var(--app-muted)] mb-3">自动同步在数据变更后延迟触发，同时间只允许一次同步。手动操作始终优先。</p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-[var(--app-accent)]"
                defaultChecked={true}
                onChange={(e) => {
                  if (e.target.checked) {
                    try { localStorage.removeItem("bristol_autosync_disabled"); } catch {}
                  } else {
                    try { localStorage.setItem("bristol_autosync_disabled", "1"); } catch {}
                  }
                }}
              />
              <span className="text-sm text-[var(--app-text)]">启用自动同步</span>
            </label>
          </div>
        </SettingsSection>

        {/* ──────────────────── 9. 诊断 ──────────────────── */}
        <SettingsSection title="诊断" subtitle="检查系统健康和调试工具" defaultOpen={false}>
          <p className="text-xs text-[var(--app-muted)] mb-3">诊断页面可检查 Supabase 连接、localStorage 状态和服务的各项健康指标，并一键复制诊断报告。</p>
          <a className="block w-full" href="/debug"><AppButton variant="secondary" className="w-full">🔍 打开诊断页面</AppButton></a>
        </SettingsSection>
      </div>
    </AppShell>
  );
}