"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { downloadJson, readJsonFile } from "@/components/JsonImportExport";
import { PageHeader } from "@/components/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ThemeStylePicker } from "@/components/settings/ThemeStylePicker";
import { DataManagementCenter } from "@/components/DataManagementCenter";
import { QuickActionsSettingsPanel } from "@/components/settings/QuickActionsSettingsPanel";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  getBackgroundOverlayStyle,
  getBackgroundSettings,
  getBackgroundStyle,
  saveBackgroundSettings
} from "@/lib/background";
import { uploadBackgroundImageDirectly, validateBackgroundImageFile } from "@/lib/backgroundUpload";
import {
  clearCloudConnection,
  getCloudConnection,
  getCloudSyncStatus,
  getDefaultSpaceCode,
  getLastSyncTime,
  getSpaceByCode,
  isCloudConfigured,
  pullAndPersistCloudData,
  saveCloudConnection,
  setLastSyncTime,
  uploadLocalDataToCloud
} from "@/lib/cloudSync";
import { markLocalChange, runAutoSyncNow, scheduleAutoSync } from "@/lib/autoSync";
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
  const [colorDraft, setColorDraft] = useState("#fff8f0");
  const [imageUrlDraft, setImageUrlDraft] = useState("");

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
  }, []);

  const counts = useMemo(() => ({
    courses: data?.courses.length || 0,
    deadlines: data?.deadlines.length || 0,
    loveNotes: data?.loveNotes.length || 0,
    links: data?.links.length || 0
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
    const result = await pullAndPersistCloudData(cloudCode.trim());
    if (result.ok && result.data) {
      setData(result.data);
      setLastSync(getLastSyncTime());
      setCloudMessage("同步成功。");
    } else {
      setCloudMessage(result.error || "同步失败，本地数据已保留。");
    }
  }

  if (!data) return <AppShell><div className="soft-card">正在加载设置...</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="设置" subtitle="这里管理昵称、见面日期、小纸条、常用链接、本地数据和云同步。" />

      <div className="flex w-full min-w-0 flex-col gap-4">
        {/* ──────────────────── Profile ──────────────────── */}
        <SettingsSection title="Profile" subtitle="基础信息" className="bg-gradient-to-br from-white/85 to-blush/45">
          <div className="mt-2"><AutoSyncStatusBadge /></div>
          <label className="block text-sm text-[var(--app-muted)]">
            昵称
            <input className="field mt-1" value={data.nickname || "小乖"} onChange={(e) => update({ ...data, nickname: e.target.value || "小乖" })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            下次见面日期
            <input className="field mt-1" type="date" value={data.nextMeetDate} onChange={(e) => update({ ...data, nextMeetDate: e.target.value })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            学期结束日期
            <input className="field mt-1" type="date" value={data.semesterEndDate || ""} onChange={(e) => update({ ...data, semesterEndDate: e.target.value })} />
          </label>
          <label className="block text-sm text-[var(--app-muted)]">
            本地小纸条 fallback
            <textarea className="field mt-1 min-h-28" value={data.note} onChange={(e) => update({ ...data, note: e.target.value })} />
          </label>
        </SettingsSection>

        {/* ──────────────────── Background ──────────────────── */}
        <SettingsSection title="Appearance" subtitle="背景设置 — 上传背景图后会同步到云端" className="bg-gradient-to-br from-white/85 to-lilac/45">
          <div className="mt-2"><AutoSyncStatusBadge /></div>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--app-muted)]">预设背景</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["cream", "奶油白"],
                ["pink", "淡粉"],
                ["lavender", "浅紫"],
                ["blue", "浅蓝"],
                ["green", "浅绿"],
                ["dark", "深色"]
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

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-[var(--app-muted)]">
              自定义颜色
              <div className="mt-1 flex gap-2">
                <input
                  className="h-12 w-16 rounded-2xl border border-white/80 bg-white/80 p-1"
                  type="color"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                />
                <input
                  className="field"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                />
              </div>
              <button className="btn-secondary btn-small mt-2" type="button" onClick={() => updateBackground({ ...data.backgroundSettings, mode: "color", color: colorDraft })}>
                应用颜色
              </button>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              远程图片 URL
              <input
                className="field mt-1"
                placeholder="https://..."
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
              />
              <button className="btn-secondary btn-small mt-2" type="button" onClick={() => updateBackground({ ...data.backgroundSettings, mode: "url", imageUrl: imageUrlDraft })}>
                应用 URL
              </button>
            </label>
          </div>

          <label className="file-panel">
            <span className="font-medium text-[var(--app-text)]">上传云端背景图片</span>
            <span className="mt-1 block text-xs text-[var(--app-muted)]">JPG / PNG / WebP / HEIC / HEIF，最大 30MB</span>
            <input
              className="mt-3 block w-full text-sm"
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
                    portraitEnhance: true
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

          <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/55 p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium text-[var(--app-muted)]">实时预览</p>
            <div className="relative h-32 overflow-hidden rounded-[1.2rem] border border-white/70" style={getBackgroundStyle(data.backgroundSettings)}>
              <div className="absolute inset-0" style={getBackgroundOverlayStyle(data.backgroundSettings)} />
              <div className="relative z-10 flex h-full items-end p-3">
                <div className="rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-[var(--app-text)] shadow-sm backdrop-blur">
                  Bristol Care<br />背景预览
                </div>
              </div>
            </div>
          </div>

          {(data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl || data.backgroundSettings.cloudImageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="背景预览"
              className="max-h-48 w-full rounded-[1.5rem] border border-white/80 bg-white/60 object-cover shadow-sm"
              src={data.backgroundSettings.cloudImageUrl || data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl}
            />
          ) : null}

          <div className="space-y-4 rounded-[1.5rem] border border-white/80 bg-white/55 p-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[var(--app-text)]">人物照片优化</p>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">如果用人物照片做背景，可以试试“人物照片”或“柔和人物背景”。</p>
            </div>
            <label className="block text-sm text-[var(--app-muted)]">
              背景显示模式
              <select
                className="field mt-1"
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
                  ["偏右", { x: 72, y: 45 }, "right"]
                ].map(([label, focalPoint, imagePosition]) => (
                  <button
                    className="btn-secondary btn-small"
                    key={String(label)}
                    onClick={() => updateBackgroundPartial({ focalPoint: focalPoint as BackgroundSettings["focalPoint"], imagePosition: imagePosition as BackgroundSettings["imagePosition"] })}
                    type="button"
                  >
                    {String(label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-[var(--app-muted)]">
                焦点 X：{data.backgroundSettings.focalPoint?.x ?? 50}%
                <input
                  className="mt-2 w-full accent-[#8c6a60]"
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
                  className="mt-2 w-full accent-[#8c6a60]"
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
                  className="mt-2 w-full accent-[#8c6a60]"
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
                  className="mt-2 w-full accent-[#8c6a60]"
                  max={130}
                  min={90}
                  type="range"
                  value={data.backgroundSettings.scale ?? 100}
                  onChange={(e) => updateBackgroundPartial({ scale: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-[var(--app-muted)]">
                兼容遮罩
                <select className="field mt-1" value={data.backgroundSettings.overlay || "light"} onChange={(e) => updateBackgroundPartial({ overlay: e.target.value as BackgroundSettings["overlay"] })}>
                  <option value="none">无</option>
                  <option value="light">浅</option>
                  <option value="medium">中</option>
                  <option value="strong">强</option>
                </select>
              </label>
              <label className="check-card">
                <input checked={Boolean(data.backgroundSettings.blur)} type="checkbox" onChange={(e) => updateBackgroundPartial({ blur: e.target.checked })} />
                柔化背景
              </label>
              <label className="check-card md:col-span-2">
                <input checked={Boolean(data.backgroundSettings.portraitEnhance)} type="checkbox" onChange={(e) => updateBackgroundPartial({ portraitEnhance: e.target.checked, dim: e.target.checked ? Math.max(data.backgroundSettings.dim || 20, 35) : data.backgroundSettings.dim })} />
                人物照片优化
              </label>
            </div>
          </div>

          <button className="btn-secondary w-full" onClick={() => { setColorDraft("#fff8f0"); setImageUrlDraft(""); updateBackground(DEFAULT_BACKGROUND_SETTINGS); }} type="button">
            恢复默认背景
          </button>
        </SettingsSection>

        {/* ──────────────────── Theme ──────────────────── */}
        <SettingsSection title="Theme" subtitle="切换后会影响卡片、边框、按钮、底部导航和轻装饰" className="bg-gradient-to-br from-white/85 to-blush/40">
          <ThemeStylePicker
            currentStyle={data.themeSettings.style}
            onSelect={(style) => updateTheme(getThemeDefaultsForStyle(style))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-[var(--app-muted)]">
              卡片样式
              <select className="field mt-1" value={data.themeSettings.cardStyle} onChange={(e) => updateThemePartial({ cardStyle: e.target.value as ThemeSettings["cardStyle"] })}>
                <option value="glass">玻璃</option>
                <option value="solid">实色</option>
                <option value="paper">纸张</option>
                <option value="flat">扁平</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              底部导航
              <select className="field mt-1" value={data.themeSettings.navStyle} onChange={(e) => updateThemePartial({ navStyle: e.target.value as ThemeSettings["navStyle"] })}>
                <option value="glass">玻璃</option>
                <option value="pill">胶囊</option>
                <option value="paper">纸张</option>
                <option value="minimal">极简</option>
                <option value="floating">浮动</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              圆角
              <select className="field mt-1" value={data.themeSettings.radius} onChange={(e) => updateThemePartial({ radius: e.target.value as ThemeSettings["radius"] })}>
                <option value="medium">中</option>
                <option value="large">大</option>
                <option value="extra">超大</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--app-muted)]">
              装饰
              <select className="field mt-1" value={data.themeSettings.decoration} onChange={(e) => updateThemePartial({ decoration: e.target.value as ThemeSettings["decoration"] })}>
                <option value="none">无</option>
                <option value="stars">星星</option>
                <option value="hearts">爱心</option>
                <option value="tape">胶带</option>
                <option value="moon">月亮</option>
              </select>
            </label>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-3 shadow-sm">
            <p className="section-kicker mb-2">Preview</p>
            <div className="soft-card p-3">
              <p className="font-semibold text-[var(--app-text)]">示例卡片</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">风格会同步影响全站组件。</p>
              <button className="btn-primary btn-small mt-3">示例按钮</button>
            </div>
            <div className="app-bottom-nav mt-3 rounded-2xl border p-2 text-center text-sm text-[var(--app-muted)]">底部导航预览 · 首页 / 记录 / 回忆</div>
          </div>
          <button className="btn-secondary w-full" onClick={() => updateTheme(DEFAULT_THEME_SETTINGS)} type="button">恢复默认风格</button>
        </SettingsSection>

        {/* ──────────────────── Cloud Sync ──────────────────── */}
        <SettingsSection title="Cloud" subtitle="云同步" className="bg-gradient-to-br from-white/80 to-skySoft/55" defaultOpen={true}>
          <p className="mb-3 rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-sm text-[var(--app-muted)] shadow-sm">
            {isCloudConfigured() ? getCloudSyncStatus() : "云同步未配置，当前为本地模式。"}
          </p>
          {lastSync ? <p className="mb-3 text-xs text-[var(--app-muted)]">最近同步：{new Date(lastSync).toLocaleString("zh-CN")}</p> : null}
          <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-[var(--app-muted)] shadow-sm">
            <span>课程 {counts.courses}</span>
            <span>Deadline {counts.deadlines}</span>
            <span>小纸条 {counts.loveNotes}</span>
            <span>常用链接 {counts.links}</span>
          </div>
          <label className="mt-3 block text-sm text-[var(--app-muted)]">
            访问码
            <input className="field mt-1" value={cloudCode} onChange={(e) => setCloudCode(e.target.value)} />
          </label>
              <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary w-full sm:w-auto" onClick={connectCloud} disabled={!isCloudConfigured()}>连接云同步</button>
            {isCloudConfigured() ? (
              <div className="flex w-full min-w-0 flex-wrap gap-2 sm:grid sm:grid-cols-2">
                <button className="btn-secondary" onClick={manualSync}>手动同步</button>
                <button className="btn-secondary" onClick={uploadCloud}>上传本地到云端</button>
                <button className="btn-secondary" onClick={pullCloud}>从云端恢复</button>
                <button className="btn-danger" onClick={() => { clearCloudConnection(); setLastSync(null); setCloudMessage("已关闭云同步。"); }}>关闭云同步</button>
              </div>
            ) : null}
          </div>
          {cloudMessage ? <p className="notice mt-3 break-words whitespace-pre-wrap">{cloudMessage}</p> : null}
        </SettingsSection>

        {/* ──────────────────── Links ──────────────────── */}
        <SettingsSection title="Links" subtitle="常用链接" className="bg-gradient-to-br from-white/85 to-butter/35">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--app-text)]">常用链接</h2>
            </div>
            <button
              className="btn-secondary btn-small"
              onClick={() => update({ ...data, links: [...data.links, { id: crypto.randomUUID(), title: "新链接", url: "https://", category: "general", sortOrder: data.links.length + 1 }] })}
            >
              添加
            </button>
          </div>
          <div className="space-y-3">
            {data.links.map((link) => (
              <div className="rounded-[1.35rem] border border-white/75 bg-cream/70 p-3 shadow-sm" key={link.id}>
                <input className="field mb-2" value={link.title} onChange={(e) => update({ ...data, links: data.links.map((item) => item.id === link.id ? { ...item, title: e.target.value } : item) })} />
                <input className="field" value={link.url} onChange={(e) => update({ ...data, links: data.links.map((item) => item.id === link.id ? { ...item, url: e.target.value } : item) })} />
                <button className="btn-danger btn-small mt-2" onClick={() => update({ ...data, links: data.links.filter((item) => item.id !== link.id) })}>
                  删除
                </button>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* ──────────────────── Quick Actions ──────────────────── */}
        <QuickActionsSettingsPanel />

        {/* ──────────────────── Local Data ──────────────────── */}
        <SettingsSection title="Local Data" subtitle="本地数据管理" className="bg-gradient-to-br from-white/85 to-lilac/35">
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <button className="btn-secondary" onClick={() => downloadJson("bristol-care-data.json", data)}>导出全部 JSON</button>
            <label className="btn-secondary cursor-pointer">
              导入全部 JSON
              <input
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
            <button className="btn-danger sm:col-span-2" onClick={() => { resetAppData(); setData(loadAppData()); }}>
              重置所有本地数据
            </button>
          </div>
          {importMessage ? <p className="notice mt-3">{importMessage}</p> : null}
        </SettingsSection>

        {/* ──────────────────── Advanced ──────────────────── */}
        <SettingsSection title="Advanced" subtitle="高级数据管理" className="bg-gradient-to-br from-white/85 to-skySoft/40" defaultOpen={false}>
          <DataManagementCenter data={data} onData={setData} onUploadCloud={uploadCloud} onPullCloud={pullCloud} />
        </SettingsSection>
      </div>
    </AppShell>
  );
}