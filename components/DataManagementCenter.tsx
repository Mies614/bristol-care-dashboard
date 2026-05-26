"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadJson, readJsonFile } from "./JsonImportExport";
import { AutoSyncStatusBadge } from "./AutoSyncStatusBadge";
import { useAutoSync } from "@/hooks/useAutoSync";
import { DEFAULT_BACKGROUND_SETTINGS, saveBackgroundSettings } from "@/lib/background";
import { clearPendingSyncState, markLocalChange, runAutoSyncNow, scheduleAutoSync } from "@/lib/autoSync";
import { createBackupPayload, restoreBackupPayload } from "@/lib/backup";
import { getCloudStats, getLocalDataStats } from "@/lib/dataStats";
import { clearAllCardImages, clearAllWalletCards, listCardStates, listWalletCards } from "@/lib/cardWalletDb";
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
  const [cardCount, setCardCount] = useState(0);
  const [cardImageCount, setCardImageCount] = useState(0);
  const stats = useMemo(() => getLocalDataStats(data), [data]);
  const cloud = getCloudStats();
  const autoSync = useAutoSync();

  useEffect(() => {
    Promise.all([listWalletCards(), listCardStates()])
      .then(([cards, states]) => {
        setCardCount(cards.length);
        setCardImageCount(states.filter((state) => state.hasImage).length);
      })
      .catch(() => {
        setCardCount(0);
        setCardImageCount(0);
      });
  }, []);

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
        <span>经期记录 {stats.periodRecords}</span>
        <span>最近经期 {stats.latestPeriodDate || "无"}</span>
        <span>相册缓存 {stats.albumCacheCount}</span>
        <span>本地会员卡 {cardCount}</span>
        <span>会员卡图片 {cardImageCount}</span>
        <span>背景 {stats.hasBackgroundSettings ? "已设置" : "默认"}</span>
        <span>共享空间 {stats.sharedAccess ? "已进入" : "未进入"}</span>
        <span>云同步 {cloud.connected ? "已连接" : "未连接"}</span>
      </div>
      <div className="rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-cocoa/70 shadow-sm">
        <p>space code: {cloud.code || "未连接"}</p>
        <p>最近同步: {cloud.lastSync ? new Date(cloud.lastSync).toLocaleString("zh-CN") : "无"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AutoSyncStatusBadge />
          <span>自动同步：{autoSync.enabled ? "开启" : "关闭"}</span>
        </div>
        <p>自动同步时间: {autoSync.lastSyncAt ? new Date(autoSync.lastSyncAt).toLocaleString("zh-CN") : "无"}</p>
        {autoSync.lastError ? <p>最近错误: {autoSync.lastError}</p> : null}
        {autoSync.pending ? <p>有待同步数据</p> : null}
        {message ? <p className="mt-2">{message}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="check-card">
          <input checked={autoSync.enabled} type="checkbox" onChange={(event) => autoSync.setEnabled(event.target.checked)} />
          自动同步到云端
        </label>
        <button className="btn-secondary" onClick={() => runAutoSyncNow("settings_manual")}>立即同步</button>
        <button className="btn-secondary" onClick={() => { clearPendingSyncState(); setMessage("同步错误已清除。"); }}>清除同步错误</button>
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
                if (confirm("已导入本地，是否同步到云端？")) {
                  markLocalChange("backup_import");
                  scheduleAutoSync("backup_import_confirmed");
                  setMessage("导入完成，已加入同步队列。");
                } else {
                  setMessage("导入完成，暂未同步到云端。");
                }
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
        <button className="btn-secondary" onClick={() => { if (confirm("确定重置背景设置吗？")) { saveBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS); markLocalChange("background"); scheduleAutoSync("background_reset"); } }}>重置背景设置</button>
        <button className="btn-secondary" onClick={() => { clearSharedAccess(); setMessage("已退出共享空间。"); }}>退出共享空间</button>
        <button className="btn-secondary" onClick={async () => { if (confirm("确定清除本机保存的会员卡图片吗？")) { await clearAllCardImages(); setCardImageCount(0); setMessage("本地会员卡图片已清除。"); } }}>清除本地会员卡图片</button>
        <button className="btn-danger" onClick={async () => { if (confirm("确定清除全部本地会员卡吗？")) { await clearAllWalletCards(); setCardCount(0); setCardImageCount(0); setMessage("本地会员卡已清除。"); } }}>清除全部本地会员卡</button>
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
