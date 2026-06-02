"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { BackupImportSummary } from "@/lib/backupTypes";
import { ReminderMonitorTab } from "@/components/admin/ReminderMonitorTab";
import type { LoveNote } from "@/lib/types";

type Tab = "backup" | "restore" | "softDeleted" | "orphans" | "monitor";

interface OrphanSummary {
  totalDbOrphans: number;
  totalStorageGaps: number;
  buckets: Array<{
    bucket: string;
    dbOrphanCount: number;
    storageGapCount: number;
    error?: string;
  }>;
}

interface OrphanDetail {
  bucket: string;
  dbOrphans: string[];
  storageGaps: string[];
  dbOrphanCount: number;
  storageGapCount: number;
  error?: string;
}

// Generic API response for admin endpoints
interface ApiResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

export function DataMaintenanceCenter({ onRefresh }: { onRefresh: () => void }) {
  const [tab, setTab] = useState<Tab>("backup");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  // Backup
  const [backupJson, setBackupJson] = useState<string | null>(null);
  const [backupCounts, setBackupCounts] = useState<BackupImportSummary | null>(null);

  // Restore
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<BackupImportSummary | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<ApiResponse | null>(null);

  // Soft deleted
  const [softDeletedNotes, setSoftDeletedNotes] = useState<LoveNote[]>([]);
  const [softDeletedLoading, setSoftDeletedLoading] = useState(false);

  // Orphans
  const [orphanSummary, setOrphanSummary] = useState<OrphanSummary | null>(null);
  const [orphanDetails, setOrphanDetails] = useState<OrphanDetail[]>([]);
  const [orphanLoading, setOrphanLoading] = useState(false);
  const [orphanExpanded, setOrphanExpanded] = useState<string | null>(null);

  const code = getDefaultSpaceCode();

  function getArrayLength(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
  }

  // ─── Backup Export ───
  const handleExport = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/backup/export?code=${encodeURIComponent(code)}`,
        { headers: { "x-admin-password": password } }
      );
      if (res.headers.get("content-type")?.includes("application/json")) {
        const payload = await res.json() as ApiResponse;
        if (res.ok && payload.data) {
          const d = payload.data as Record<string, unknown>;
          setBackupCounts({
            notes: (Array.isArray(d.notes) ? d.notes.length : 0) as number,
            albums: (Array.isArray(d.albums) ? d.albums.length : 0) as number,
            deadlines: (Array.isArray(d.deadlines) ? d.deadlines.length : 0) as number,
            courses: (Array.isArray(d.courses) ? d.courses.length : 0) as number,
            periodRecords: (Array.isArray(d.periodRecords) ? d.periodRecords.length : 0) as number,
          });
          setBackupJson(JSON.stringify(payload, null, 2));
          setMessage(`备份已生成，包含 notes x${backupCounts?.notes || getArrayLength(d.notes) || 0}, DDL x${backupCounts?.deadlines || getArrayLength(d.deadlines) || 0}, 课程 x${backupCounts?.courses || getArrayLength(d.courses) || 0}`);
        } else {
          setMessage((payload.error as string) || "导出失败");
        }
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bristol-care-backup-${code}-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("备份文件已下载。");
      }
    } catch (err) {
      setMessage(`导出失败：${err instanceof Error ? err.message : "网络错误"}`);
    } finally {
      setLoading(false);
    }
  }, [code, password, backupCounts]);

  function downloadJsonFromState() {
    if (!backupJson) return;
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bristol-care-backup-${code}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Restore Import ───
  async function handleImportPreview() {
    if (!importFile) return;
    setMessage("");
    setImportConfirm(false);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch(
        `/api/admin/backup/import?code=${encodeURIComponent(code)}&dryRun=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify(parsed),
        }
      );
      const payload = await res.json() as ApiResponse;
      if (payload.error) {
        setMessage(payload.error as string);
        return;
      }
      const s = payload.summary as Record<string, unknown> | undefined;
      setImportSummary(s as BackupImportSummary);
      setMessage(
        `预览：notes x${s?.notes || 0}, DDL x${s?.deadlines || 0}, 课程 x${s?.courses || 0}, albums x${s?.albums || 0}。` +
          `将新增 ${payload.totalToInsert || 0} 条，跳过 ${payload.totalSkipped || 0} 条（已存在）。`
      );
    } catch (err) {
      setMessage(`解析失败：${err instanceof Error ? err.message : "文件格式错误"}`);
    }
  }

  async function handleImportExecute() {
    if (!importFile || !importConfirm) return;
    setLoading(true);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch(
        `/api/admin/backup/import?code=${encodeURIComponent(code)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify(parsed),
        }
      );
      const payload = await res.json() as ApiResponse;
      setImportResult(payload);
      if (payload.ok) {
        setMessage("数据导入完成。现有数据未被修改，已存在的记录已跳过。");
        onRefresh();
      } else {
        setMessage((payload.error as string) || "导入失败，现有数据未被修改。");
      }
    } catch (err) {
      setMessage(`导入失败：${err instanceof Error ? err.message : "错误"}`);
    } finally {
      setLoading(false);
      setImportConfirm(false);
    }
  }

  // ─── Soft Deleted ───
  const fetchSoftDeleted = useCallback(async () => {
    setSoftDeletedLoading(true);
    try {
      const res = await fetch(
        `/api/admin/soft-deleted?code=${encodeURIComponent(code)}`,
        { headers: { "x-admin-password": password } }
      );
      const payload = await res.json() as ApiResponse;
      if (payload.ok) {
        setSoftDeletedNotes((payload.notes as LoveNote[]) || []);
      } else {
        setMessage(payload.error as string || "加载失败");
      }
    } catch {
      setMessage("加载已删除小纸条失败");
    } finally {
      setSoftDeletedLoading(false);
    }
  }, [code, password]);

  useEffect(() => {
    if (tab === "softDeleted") fetchSoftDeleted();
  }, [tab, fetchSoftDeleted]);

  async function handleRestoreNote(id: string) {
    try {
      const res = await fetch("/api/admin/soft-deleted", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, action: "restore" }),
      });
      const p = await res.json() as ApiResponse;
      if (p.ok) {
        setMessage("小纸条已恢复。");
        fetchSoftDeleted();
        onRefresh();
      } else {
        setMessage(p.error as string || "恢复失败");
      }
    } catch {
      setMessage("恢复请求失败");
    }
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("确定永久删除这条小纸条吗？此操作不可撤销，但 Storage 文件不会被删除。")) return;
    try {
      const res = await fetch("/api/admin/soft-deleted", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, action: "permanent_delete" }),
      });
      const p = await res.json() as ApiResponse;
      if (p.ok) {
        setMessage("小纸条已永久删除。Storage 文件未删除。");
        fetchSoftDeleted();
      } else {
        setMessage(p.error as string || "删除失败");
      }
    } catch {
      setMessage("删除请求失败");
    }
  }

  // ─── Storage Orphans ───
  const fetchOrphans = useCallback(async () => {
    setOrphanLoading(true);
    setOrphanSummary(null);
    setOrphanDetails([]);
    try {
      const res = await fetch(
        `/api/admin/storage/orphans?code=${encodeURIComponent(code)}`,
        { headers: { "x-admin-password": password } }
      );
      const p = await res.json() as ApiResponse;
      if (p.status === "unavailable") {
        setMessage("Supabase 未配置，无法检查孤儿文件。");
      } else if (p.ok) {
        const summary = p.summary as OrphanSummary;
        setOrphanSummary(summary);
        setOrphanDetails((p.orphans as OrphanDetail[]) || []);
        const total = summary.totalDbOrphans + summary.totalStorageGaps;
        setMessage(total === 0 ? "未发现孤儿文件或缺失引用。" : `发现 ${summary.totalDbOrphans} 个孤儿文件，${summary.totalStorageGaps} 个缺失引用。`);
      } else {
        setMessage(p.error as string || "检查失败");
      }
    } catch {
      setMessage("孤儿文件检查请求失败");
    } finally {
      setOrphanLoading(false);
    }
  }, [code, password]);

  useEffect(() => {
    if (tab === "orphans") fetchOrphans();
  }, [tab, fetchOrphans]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "backup", label: "导出备份", icon: "📥" },
    { key: "restore", label: "导入恢复", icon: "📤" },
    { key: "softDeleted", label: "已删除", icon: "🗑" },
    { key: "orphans", label: "孤儿文件", icon: "📦" },
    { key: "monitor", label: "提醒监控", icon: "🔔" },
  ];

  return (
    <AppCard className="bg-gradient-to-br from-white/85 via-skySoft/20 to-white/80">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="section-kicker mb-1">Maintenance</p>
          <h2 className="font-semibold text-cocoa">数据维护中心</h2>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? "bg-sage/20 text-sage shadow-sm"
                : "bg-white/55 text-cocoa/50 hover:bg-white/80"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Admin password */}
      <div className="mb-3">
        <label className="text-xs text-cocoa/50">后台密码</label>
        <input
          className="mt-1 w-full rounded-lg border border-white/80 bg-white/55 px-3 py-1.5 text-sm text-cocoa placeholder:text-cocoa/30"
          type="password"
          placeholder="输入 ADMIN_PASSWORD"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {/* ─── Tab: Backup Export ─── */}
      {tab === "backup" && (
        <div className="space-y-3">
          <p className="text-xs text-cocoa/50">
            从 Supabase 导出完整数据备份为 JSON 文件。包含小纸条、DDL、课程、相册和经期记录。
          </p>
          <div className="flex flex-wrap gap-2">
            <AppButton variant="primary" size="sm" onClick={handleExport} disabled={loading || !password}>
              {loading ? "导出中..." : "📥 从云端导出备份"}
            </AppButton>
            {backupCounts && backupJson && (
              <AppButton variant="secondary" size="sm" onClick={downloadJsonFromState}>
                💾 下载 JSON
              </AppButton>
            )}
          </div>
          {backupCounts && (
            <div className="rounded-lg bg-white/55 p-2 text-xs text-cocoa/60 space-x-3">
              <span>📝 notes x{backupCounts.notes}</span>
              <span>📋 DDL x{backupCounts.deadlines}</span>
              <span>📚 课程 x{backupCounts.courses}</span>
              <span>🖼 albums x{backupCounts.albums}</span>
              <span>🌸 经期 x{backupCounts.periodRecords}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Restore Import ─── */}
      {tab === "restore" && (
        <div className="space-y-3">
          <p className="text-xs text-cocoa/50">
            选择 JSON 备份文件，预览后再导入。已存在的记录（相同 ID）会被跳过，现有数据不会丢失。
          </p>
          <div className="rounded-lg border border-dashed border-white/80 bg-white/55 p-3">
            <label className="cursor-pointer text-xs text-cocoa/50">
              📁 选择备份文件
              <input
                className="mt-2 block w-full text-xs"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  setImportFile(e.currentTarget.files?.[0] || null);
                  setImportSummary(null);
                  setImportConfirm(false);
                  setImportResult(null);
                  setMessage("");
                }}
              />
            </label>
          </div>
          {importFile && !importSummary && (
            <AppButton variant="primary" size="sm" onClick={handleImportPreview} disabled={!password}>
              🔍 预览导入内容
            </AppButton>
          )}
          {importSummary && (
            <div className="space-y-2">
              <div className="rounded-lg bg-white/55 p-2 text-xs text-cocoa/60 space-x-3">
                <span>📝 notes x{importSummary.notes}</span>
                <span>📋 DDL x{importSummary.deadlines}</span>
                <span>📚 课程 x{importSummary.courses}</span>
                <span>🖼 albums x{importSummary.albums}</span>
                <span>🌸 经期 x{importSummary.periodRecords}</span>
              </div>
              {!importConfirm ? (
                <AppButton variant="secondary" size="sm" onClick={() => setImportConfirm(true)} disabled={!password}>
                  ⚠️ 确认导入（不会覆盖现有数据）
                </AppButton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <AppButton variant="primary" size="sm" onClick={handleImportExecute} disabled={loading}>
                    {loading ? "导入中..." : "✅ 确认执行导入"}
                  </AppButton>
                  <AppButton variant="secondary" size="sm" onClick={() => setImportConfirm(false)}>
                    取消
                  </AppButton>
                </div>
              )}
            </div>
          )}
          {importResult && importResult.ok && (
            <div className="rounded-lg bg-sage/15 p-2 text-xs text-sage space-y-1">
              <div>✅ 导入完成</div>
              <div>新增：notes {(importResult.imported as Record<string, number>)?.notes || 0}，DDL {(importResult.imported as Record<string, number>)?.deadlines || 0}</div>
              <div>跳过：notes {(importResult.skipped as Record<string, number>)?.notes || 0}，DDL {(importResult.skipped as Record<string, number>)?.deadlines || 0}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Soft Deleted ─── */}
      {tab === "softDeleted" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-cocoa/50">
              已软删除的小纸条（还在数据库里，但不会显示在纸条墙上）。
            </p>
            <AppButton variant="secondary" size="sm" onClick={fetchSoftDeleted} disabled={softDeletedLoading}>
              🔄 刷新
            </AppButton>
          </div>
          {softDeletedLoading && <p className="text-xs text-cocoa/40">加载中...</p>}
          {!softDeletedLoading && softDeletedNotes.length === 0 && (
            <p className="text-xs text-cocoa/40">没有已删除的小纸条 ✨</p>
          )}
          {softDeletedNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-sm space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-cocoa/70 truncate max-w-48">
                  {note.content?.slice(0, 40) || "(无文字)"}
                </span>
                <span className="text-[10px] text-cocoa/30 shrink-0 ml-2">
                  {note.deletedAt?.slice(0, 10)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-xs text-sage hover:underline"
                  onClick={() => handleRestoreNote(note.id)}
                >
                  恢复
                </button>
                <button
                  className="text-xs text-rose/60 hover:underline"
                  onClick={() => handlePermanentDelete(note.id)}
                >
                  永久删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tab: Storage Orphans ─── */}
      {tab === "monitor" && (
        <ReminderMonitorTab password={password} />
      )}

      {/* ─── Tab: Storage Orphans ─── */}
      {tab === "orphans" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-cocoa/50">
              检查 Supabase Storage 中的孤儿文件（未被数据库引用）和缺失引用（数据库引用但 Storage 中不存在）。只检查不删除。
            </p>
            <AppButton variant="secondary" size="sm" onClick={fetchOrphans} disabled={orphanLoading}>
              {orphanLoading ? "检查中..." : "🔍 检查孤儿文件"}
            </AppButton>
          </div>
          {orphanSummary && (
            <div className="text-xs text-cocoa/60 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/55 p-2">
                  <span className="text-cocoa/40">孤儿文件</span>
                  <span className="ml-2 font-semibold text-amber">{orphanSummary.totalDbOrphans}</span>
                </div>
                <div className="rounded-lg bg-white/55 p-2">
                  <span className="text-cocoa/40">缺失引用</span>
                  <span className="ml-2 font-semibold text-rose">{orphanSummary.totalStorageGaps}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {orphanSummary.buckets.map((b) => (
                  <div key={b.bucket} className="rounded-lg bg-white/55 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-cocoa/60">{b.bucket}</span>
                      <span className="text-cocoa/40">
                        {b.error ? `⚠ ${b.error}` : `孤儿 ${b.dbOrphanCount} · 缺失 ${b.storageGapCount}`}
                      </span>
                      {orphanDetails.find((d) => d.bucket === b.bucket)?.dbOrphans.length ? (
                        <button
                          className="text-sage text-[10px] hover:underline ml-2"
                          onClick={() =>
                            setOrphanExpanded(
                              orphanExpanded === b.bucket ? null : b.bucket
                            )
                          }
                        >
                          {orphanExpanded === b.bucket ? "收起" : "详情"}
                        </button>
                      ) : null}
                    </div>
                    {orphanExpanded === b.bucket && (
                      <div className="mt-2 max-h-32 overflow-auto space-y-1">
                        {orphanDetails
                          .find((d) => d.bucket === b.bucket)
                          ?.dbOrphans.map((p) => (
                            <div key={p} className="text-[10px] text-amber/80 truncate">
                              🗑 {p}
                            </div>
                          ))}
                        {orphanDetails
                          .find((d) => d.bucket === b.bucket)
                          ?.storageGaps.map((p) => (
                            <div key={p} className="text-[10px] text-rose/80 truncate">
                              ⚠ {p}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {message ? (
        <div className="mt-3 rounded-lg border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-2 text-xs text-[var(--app-text)] break-words">
          {message}
        </div>
      ) : null}
    </AppCard>
  );
}
