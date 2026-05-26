"use client";

import { useMemo, useState } from "react";
import { downloadJson, readJsonFile } from "./JsonImportExport";
import { DEFAULT_BACKGROUND_SETTINGS, saveBackgroundSettings } from "@/lib/background";
import { createBackupPayload, restoreBackupPayload } from "@/lib/backup";
import { getCloudStats, getLocalDataStats } from "@/lib/dataStats";
import { getIdentityLabel } from "@/lib/identity";
import { clearSharedAccess } from "@/lib/sharedAccess";
import { loadAppData, resetAppData } from "@/lib/storage";
import type { AppData } from "@/lib/types";

export function DataManagementCenter({
  data,
  onData,
  onUploadCloud,
  onPullCloud
}: {
  data: AppData;
  onData: (data: AppData) => void;
  onUploadCloud: () => Promise<void>;
  onPullCloud: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [debugChecks, setDebugChecks] = useState<Array<{ name: string; ok: boolean; detail?: string }>>([]);
  const stats = useMemo(() => getLocalDataStats(data), [data]);
  const cloud = getCloudStats();

  async function diagnose() {
    const response = await fetch("/api/debug/supabase");
    const payload = await response.json().catch(() => ({}));
    setDebugChecks(payload.checks || []);
  }

  return (
    <section className="soft-card space-y-4">
      <div>
        <p className="section-kicker mb-1">Data</p>
        <h2 className="font-semibold text-cocoa">数据管理中心</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-cocoa/70 shadow-sm">
        <span>课程 {stats.courses}</span>
        <span>DDL {stats.deadlines}</span>
        <span>小纸条缓存 {stats.loveNotes}</span>
        <span>相册缓存 {stats.albumCacheCount}</span>
        <span>背景 {stats.hasBackgroundSettings ? "已设置" : "默认"}</span>
        <span>身份 {getIdentityLabel(stats.currentIdentity)}</span>
        <span>共享空间 {stats.sharedAccess ? "已进入" : "未进入"}</span>
        <span>云同步 {cloud.connected ? "已连接" : "未连接"}</span>
      </div>
      <div className="rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-cocoa/70 shadow-sm">
        <p>space code: {cloud.code || "未连接"}</p>
        <p>最近同步: {cloud.lastSync ? new Date(cloud.lastSync).toLocaleString("zh-CN") : "无"}</p>
        {message ? <p className="mt-2">{message}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => downloadJson("bristol-care-backup.json", createBackupPayload())}>导出完整 JSON 备份</button>
        <label className="btn-secondary cursor-pointer">
          导入 JSON 备份
          <input
            className="hidden"
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              try {
                const next = restoreBackupPayload(await readJsonFile(file));
                onData(next);
                setMessage("导入完成。");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "导入失败。");
              } finally {
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
        <button className="btn-secondary" onClick={onUploadCloud}>上传本地到云端</button>
        <button className="btn-secondary" onClick={onPullCloud}>从云端恢复到本地</button>
        <button className="btn-secondary" onClick={() => { if (confirm("确定重置背景设置吗？")) saveBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS); }}>重置背景设置</button>
        <button className="btn-secondary" onClick={() => { clearSharedAccess(); setMessage("已退出共享空间。"); }}>退出共享空间</button>
        <button className="btn-secondary" onClick={() => { try { localStorage.removeItem("bristol-care-onboarding-dismissed-v1"); setMessage("新手引导会重新显示。"); } catch { setMessage("操作完成。"); } }}>重新显示新手引导</button>
        <button className="btn-danger" onClick={() => { if (confirm("确定清除本项目本地缓存吗？")) { resetAppData(); onData(loadAppData()); } }}>清除本地缓存</button>
        <button className="btn-secondary" onClick={diagnose}>连接诊断</button>
      </div>
      {debugChecks.length ? (
        <div className="rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-xs leading-6 text-cocoa/70">
          {debugChecks.map((check) => <p key={check.name}>{check.ok ? "✓" : "×"} {check.name}{check.detail ? `：${check.detail}` : ""}</p>)}
        </div>
      ) : null}
    </section>
  );
}
