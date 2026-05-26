"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DataManagementCenter } from "@/components/DataManagementCenter";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { downloadJson, readJsonFile } from "@/components/JsonImportExport";
import { PageHeader } from "@/components/PageHeader";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  getBackgroundOverlayStyle,
  getBackgroundSettings,
  getBackgroundStyle,
  saveBackgroundSettings
} from "@/lib/background";
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
import { loadAppData, resetAppData, saveAppData } from "@/lib/storage";
import type { AppData, BackgroundSettings } from "@/lib/types";
import { validateAppData } from "@/lib/validation";
import { validateImageFile } from "@/lib/imageValidation";

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
    setData({ ...current, backgroundSettings: background });
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

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败。"));
      reader.readAsDataURL(file);
    });
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

      <div className="space-y-4">
        <section className="soft-card space-y-3">
          <div>
            <p className="section-kicker mb-1">Profile</p>
            <h2 className="font-semibold text-cocoa">基础信息</h2>
            <div className="mt-2"><AutoSyncStatusBadge /></div>
          </div>
          <label className="block text-sm text-cocoa/70">
            昵称
            <input className="field mt-1" value={data.nickname || "小乖"} onChange={(e) => update({ ...data, nickname: e.target.value || "小乖" })} />
          </label>
          <label className="block text-sm text-cocoa/70">
            下次见面日期
            <input className="field mt-1" type="date" value={data.nextMeetDate} onChange={(e) => update({ ...data, nextMeetDate: e.target.value })} />
          </label>
          <label className="block text-sm text-cocoa/70">
            学期结束日期
            <input className="field mt-1" type="date" value={data.semesterEndDate || ""} onChange={(e) => update({ ...data, semesterEndDate: e.target.value })} />
          </label>
          <label className="block text-sm text-cocoa/70">
            本地小纸条 fallback
            <textarea className="field mt-1 min-h-28" value={data.note} onChange={(e) => update({ ...data, note: e.target.value })} />
          </label>
        </section>
        <section className="soft-card space-y-4 bg-gradient-to-br from-white/85 to-lilac/45">
          <div>
            <p className="section-kicker mb-1">Appearance</p>
            <h2 className="font-semibold text-cocoa">背景设置</h2>
            <p className="mt-2 text-sm leading-6 text-cocoa/65">背景图片仅保存在当前浏览器；如果图片太大，请先压缩或换一张小图。</p>
            <div className="mt-2"><AutoSyncStatusBadge /></div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-cocoa/75">预设背景</p>
            <div className="grid grid-cols-3 gap-2">
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
                      ? "border-roseSoft bg-blush/75 text-cocoa"
                      : "border-white/75 bg-white/65 text-cocoa/70"
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
            <label className="block text-sm text-cocoa/70">
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
            <label className="block text-sm text-cocoa/70">
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
            <span className="font-medium text-cocoa">上传本地背景图片</span>
            <span className="mt-1 block text-xs text-cocoa/52">JPG / PNG / WebP，最大 5MB，仅保存在当前浏览器</span>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                const validation = validateImageFile(file);
                if (!validation.ok) {
                  setImportMessage(validation.error || "图片不符合要求。");
                  input.value = "";
                  return;
                }
                try {
                  updateBackground({
                    ...data.backgroundSettings,
                    mode: "image",
                    imageDataUrl: await fileToDataUrl(file),
                    imageFit: data.backgroundSettings.imageFit || "cover",
                    imagePosition: data.backgroundSettings.imagePosition || "center",
                    overlay: data.backgroundSettings.overlay || "light"
                  });
                } catch (error) {
                  setImportMessage(error instanceof Error ? error.message : "图片读取失败。");
                } finally {
                  input.value = "";
                }
              }}
            />
          </label>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/55 p-3 shadow-sm">
            <p className="mb-2 text-xs font-medium text-cocoa/60">实时预览</p>
            <div className="relative h-32 overflow-hidden rounded-[1.2rem] border border-white/70" style={getBackgroundStyle(data.backgroundSettings)}>
              <div className="absolute inset-0" style={getBackgroundOverlayStyle(data.backgroundSettings)} />
              <div className="relative z-10 flex h-full items-end p-3">
                <div className="rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-cocoa shadow-sm backdrop-blur">
                  Bristol Care<br />背景预览
                </div>
              </div>
            </div>
          </div>

          {(data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="背景预览"
              className="max-h-48 w-full rounded-[1.5rem] border border-white/80 bg-white/60 object-cover shadow-sm"
              src={data.backgroundSettings.imageDataUrl || data.backgroundSettings.imageUrl}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-cocoa/70">
              显示方式
              <select className="field mt-1" value={data.backgroundSettings.imageFit || "cover"} onChange={(e) => updateBackground({ ...data.backgroundSettings, imageFit: e.target.value as BackgroundSettings["imageFit"] })}>
                <option value="cover">cover</option>
                <option value="contain">contain</option>
              </select>
            </label>
            <label className="block text-sm text-cocoa/70">
              图片位置
              <select className="field mt-1" value={data.backgroundSettings.imagePosition || "center"} onChange={(e) => updateBackground({ ...data.backgroundSettings, imagePosition: e.target.value as BackgroundSettings["imagePosition"] })}>
                <option value="center">center</option>
                <option value="top">top</option>
                <option value="bottom">bottom</option>
              </select>
            </label>
            <label className="block text-sm text-cocoa/70">
              遮罩强度
              <select className="field mt-1" value={data.backgroundSettings.overlay || "light"} onChange={(e) => updateBackground({ ...data.backgroundSettings, overlay: e.target.value as BackgroundSettings["overlay"] })}>
                <option value="none">无</option>
                <option value="light">浅</option>
                <option value="medium">中</option>
                <option value="strong">强</option>
              </select>
            </label>
            <label className="check-card">
              <input checked={Boolean(data.backgroundSettings.blur)} type="checkbox" onChange={(e) => updateBackground({ ...data.backgroundSettings, blur: e.target.checked })} />
              图片模糊
            </label>
          </div>

          <button className="btn-secondary w-full" onClick={() => { setColorDraft("#fff8f0"); setImageUrlDraft(""); updateBackground(DEFAULT_BACKGROUND_SETTINGS); }} type="button">
            恢复默认背景
          </button>
        </section>

        <section className="soft-card bg-gradient-to-br from-white/80 to-skySoft/55">
          <p className="section-kicker mb-1">Cloud</p>
          <h2 className="mb-3 font-semibold text-cocoa">云同步</h2>
          <p className="mb-3 rounded-2xl border border-white/70 bg-white/60 px-3 py-2 text-sm text-cocoa/70 shadow-sm">
            {isCloudConfigured() ? getCloudSyncStatus() : "云同步未配置，当前为本地模式。"}
          </p>
          {lastSync ? <p className="mb-3 text-xs text-cocoa/55">最近同步：{new Date(lastSync).toLocaleString("zh-CN")}</p> : null}
          <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-cocoa/70 shadow-sm">
            <span>课程 {counts.courses}</span>
            <span>Deadline {counts.deadlines}</span>
            <span>小纸条 {counts.loveNotes}</span>
            <span>常用链接 {counts.links}</span>
          </div>
          <label className="mt-3 block text-sm text-cocoa/70">
            访问码
            <input className="field mt-1" value={cloudCode} onChange={(e) => setCloudCode(e.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={connectCloud} disabled={!isCloudConfigured()}>连接云同步</button>
            {isCloudConfigured() ? (
              <>
                <button className="btn-secondary" onClick={manualSync}>手动同步</button>
                <button className="btn-secondary" onClick={uploadCloud}>上传本地数据到云端</button>
                <button className="btn-secondary" onClick={pullCloud}>从云端恢复到本地</button>
                <button className="btn-secondary" onClick={() => { clearCloudConnection(); setLastSync(null); setCloudMessage("已关闭云同步。"); }}>关闭云同步</button>
              </>
            ) : null}
          </div>
          {cloudMessage ? <p className="notice mt-3">{cloudMessage}</p> : null}
        </section>

        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Links</p>
              <h2 className="font-semibold text-cocoa">常用链接</h2>
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
        </section>

        <section className="soft-card">
          <p className="section-kicker mb-1">Local Data</p>
          <h2 className="mb-3 font-semibold text-cocoa">本地数据</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadJson("bristol-care-data.json", data)}>导出全部数据 JSON</button>
            <label className="btn-secondary cursor-pointer">
              导入全部数据 JSON
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
            <button className="btn-danger" onClick={() => { resetAppData(); setData(loadAppData()); }}>
              重置所有本地数据
            </button>
          </div>
          {importMessage ? <p className="notice mt-3">{importMessage}</p> : null}
        </section>
        <DataManagementCenter data={data} onData={setData} onUploadCloud={uploadCloud} onPullCloud={pullCloud} />
      </div>
    </AppShell>
  );
}
