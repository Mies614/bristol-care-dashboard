"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  type QuickAction,
  type QuickActionType,
  type QuickActionAction,
  type QuickActionIcon,
  DEFAULT_QUICK_ACTIONS,
  getActionSubtitle,
  MAX_VISIBLE_ACTIONS,
} from "@/lib/quickActions";
import { saveQuickActionsToLocal } from "@/lib/quickActionsStorage";

// ── Color options ──
const COLOR_OPTIONS = [
  { value: "rose", label: "粉" },
  { value: "sage", label: "绿" },
  { value: "butter", label: "黄" },
  { value: "lilac", label: "紫" },
  { value: "skySoft", label: "蓝" },
  { value: "blush", label: "暖粉" },
  { value: "cream", label: "奶油" },
  { value: "mint", label: "薄荷" },
  { value: "cocoa", label: "棕" },
];

// ── Icon options ──
const ICON_OPTIONS: { value: QuickActionIcon; label: string }[] = [
  { value: "pencil", label: "✏️ 笔" },
  { value: "camera", label: "📷 相机" },
  { value: "calendar", label: "📅 日历" },
  { value: "clock", label: "🕐 时钟" },
  { value: "heart", label: "♥️ 心" },
  { value: "file", label: "📄 文件" },
  { value: "cart", label: "🛒 购物" },
  { value: "map", label: "🗺️ 地图" },
  { value: "mail", label: "✉️ 邮件" },
  { value: "credit-card", label: "💳 卡" },
  { value: "sparkles", label: "✨ 闪" },
  { value: "star", label: "⭐ 星" },
  { value: "link", label: "🔗 链接" },
  { value: "siren", label: "🔔 铃" },
];

// ── Action options ──
const ACTION_OPTIONS: { value: QuickActionAction; label: string }[] = [
  { value: "compose_note", label: "写小纸条" },
  { value: "upload_memory", label: "上传回忆" },
  { value: "add_deadline", label: "添加 DDL" },
  { value: "add_course", label: "添加课程" },
  { value: "record_period", label: "记录经期" },
  { value: "miss_you", label: "想你一下" },
];

// ── Internal paths ──
const INTERNAL_PATHS: { value: string; label: string }[] = [
  { value: "/", label: "首页" },
  { value: "/records", label: "记录中心" },
  { value: "/schedule", label: "课程表" },
  { value: "/deadlines", label: "Deadline" },
  { value: "/memories", label: "回忆中心" },
  { value: "/notes", label: "小纸条" },
  { value: "/albums", label: "相册" },
  { value: "/cards", label: "卡夹" },
  { value: "/period", label: "经期" },
  { value: "/settings", label: "设置" },
  { value: "/notes?compose=1", label: "写小纸条（直接）" },
  { value: "/albums?upload=1", label: "上传回忆（直接）" },
  { value: "/deadlines?action=add", label: "添加 DDL（直接）" },
  { value: "/period?action=add", label: "记录经期（直接）" },
  { value: "/schedule?action=add", label: "添加课程（直接）" },
];

export function QuickActionsSettingsPanel() {
  const [actions, setActions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");

  // Load actions
  const loadActions = useCallback(() => {
    try {
      const savedRaw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("bristol_dashboard_quick_actions")
          : null;

      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as QuickAction[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActions(parsed);
          return;
        }
      }
    } catch {
      // fall through
    }
    setActions(DEFAULT_QUICK_ACTIONS);
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Save actions
  function persist(next: QuickAction[]) {
    setActions(next);
    saveQuickActionsToLocal(next);
    setMessage("已保存快捷动作。");
    setTimeout(() => setMessage(""), 2000);
  }

  // Reset to defaults
  function resetDefaults() {
    if (!confirm("重置为默认快捷动作？自定义动作将被移除。")) return;
    persist([...DEFAULT_QUICK_ACTIONS]);
  }

  // Add new action
  function addAction() {
    const newAction: QuickAction = {
      id: `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: "",
      type: "internal",
      href: "/",
      enabled: true,
      sortOrder: actions.length,
    };
    setEditingAction(newAction);
    setShowAddForm(true);
  }

  // Start editing
  function startEdit(action: QuickAction) {
    setEditingAction({ ...action });
    setShowAddForm(true);
  }

  // Save edit
  function saveEdit() {
    if (!editingAction) return;
    if (!editingAction.label.trim()) {
      setMessage("请输入动作名称。");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    let next: QuickAction[];
    const idx = actions.findIndex((a) => a.id === editingAction.id);
    if (idx >= 0) {
      next = actions.map((a, i) => (i === idx ? editingAction : a));
    } else {
      next = [...actions, editingAction];
    }

    persist(next);
    setEditingAction(null);
    setShowAddForm(false);
  }

  // Delete action
  function deleteAction(id: string) {
    if (!confirm("确定删除这个快捷动作吗？")) return;
    persist(actions.filter((a) => a.id !== id));
  }

  // Toggle enabled
  function toggleEnabled(id: string) {
    persist(
      actions.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  // Move up/down
  function moveAction(id: string, direction: "up" | "down") {
    const idx = actions.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const next = [...actions];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    // Swap sort orders
    const tempSort = next[idx].sortOrder;
    next[idx] = { ...next[idx], sortOrder: next[targetIdx].sortOrder };
    next[targetIdx] = { ...next[targetIdx], sortOrder: tempSort };
    // Re-sort array by sortOrder
    next.sort((a, b) => a.sortOrder - b.sortOrder);
    // Re-assign sortOrder sequentially
    const reindexed = next.map((a, i) => ({ ...a, sortOrder: i }));
    persist(reindexed);
  }

  // Save on any field change
  function updateEditingField(key: keyof QuickAction, value: unknown) {
    if (!editingAction) return;
    setEditingAction({ ...editingAction, [key]: value });
  }

  // ── Render ──
  const visibleCount = actions.filter((a) => a.enabled).length;

  // New/edit form
  const formOpen = showAddForm && editingAction;
  const form = formOpen && editingAction ? (
    <div className="rounded-[1.35rem] border border-white/80 bg-white/70 p-3 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[var(--app-text)]">
        {actions.find((a) => a.id === editingAction.id) ? "编辑动作" : "新增动作"}
      </p>

      {/* Label */}
      <label className="mb-2 block text-sm text-[var(--app-muted)]">
        名称
        <input
          className="field mt-1"
          placeholder="写小纸条"
          value={editingAction.label}
          onChange={(e) => updateEditingField("label", e.target.value)}
        />
      </label>

      {/* Type */}
      <label className="mb-2 block text-sm text-[var(--app-muted)]">
        类型
        <select
          className="field mt-1"
          value={editingAction.type}
          onChange={(e) => {
            const type = e.target.value as QuickActionType;
            const upd: Partial<QuickAction> = { type };
            if (type === "action" && !editingAction.action) {
              upd.action = "miss_you";
            } else if (type === "internal" && !editingAction.href) {
              upd.href = "/";
            } else if (type === "external" && !editingAction.href) {
              upd.href = "https://";
            }
            setEditingAction({ ...editingAction, ...upd });
          }}
        >
          <option value="internal">页面入口</option>
          <option value="external">外部链接</option>
          <option value="action">一键操作</option>
        </select>
      </label>

      {/* Internal href */}
      {editingAction.type === "internal" && (
        <label className="mb-2 block text-sm text-[var(--app-muted)]">
          页面入口
          <select
            className="field mt-1"
            value={editingAction.href || "/"}
            onChange={(e) => updateEditingField("href", e.target.value)}
          >
            {INTERNAL_PATHS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* External href */}
      {editingAction.type === "external" && (
        <label className="mb-2 block text-sm text-[var(--app-muted)]">
          外部 URL
          <input
            className="field mt-1 break-all"
            placeholder="https://..."
            value={editingAction.href || ""}
            onChange={(e) => updateEditingField("href", e.target.value)}
          />
        </label>
      )}

      {/* Action type */}
      {editingAction.type === "action" && (
        <label className="mb-2 block text-sm text-[var(--app-muted)]">
          操作
          <select
            className="field mt-1"
            value={editingAction.action || "miss_you"}
            onChange={(e) =>
              updateEditingField(
                "action",
                e.target.value as QuickActionAction
              )
            }
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Icon */}
      <label className="mb-2 block text-sm text-[var(--app-muted)]">
        图标
        <select
          className="field mt-1"
          value={editingAction.icon || "pencil"}
          onChange={(e) =>
            updateEditingField("icon", e.target.value as QuickActionIcon)
          }
        >
          {ICON_OPTIONS.map((ico) => (
            <option key={ico.value} value={ico.value}>
              {ico.label}
            </option>
          ))}
        </select>
      </label>

      {/* Color */}
      <label className="mb-2 block text-sm text-[var(--app-muted)]">
        颜色
        <div className="mt-1 flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              className={`rounded-lg border px-2 py-1 text-xs transition ${
                editingAction.color === c.value
                  ? "border-cocoa/40 bg-cocoa/10 font-semibold"
                  : "border-white/80 bg-white/70"
              }`}
              onClick={() => updateEditingField("color", c.value)}
              type="button"
            >
              {c.label}
            </button>
          ))}
        </div>
      </label>

      {/* Enabled */}
      <label className="check-card mb-3">
        <input
          checked={editingAction.enabled}
          type="checkbox"
          onChange={(e) => updateEditingField("enabled", e.target.checked)}
        />
        在首页显示
      </label>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="btn-primary btn-small" onClick={saveEdit} type="button">
          保存
        </button>
        <button
          className="btn-secondary btn-small"
          onClick={() => {
            setEditingAction(null);
            setShowAddForm(false);
          }}
          type="button"
        >
          取消
        </button>
      </div>
    </div>
  ) : null;

  return (
    <SettingsSection
      title="Quick Actions"
      subtitle="快捷动作 — 首页下方的常用入口"
      className="bg-gradient-to-br from-white/85 to-butter/35"
    >
      {/* Status + controls */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--app-muted)]">
          已启用 {visibleCount} / 共 {actions.length} 个（首页最多展示 {MAX_VISIBLE_ACTIONS} 个）
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary btn-small" onClick={addAction} type="button">
            新增动作
          </button>
          <button className="btn-secondary btn-small" onClick={resetDefaults} type="button">
            恢复默认
          </button>
        </div>
      </div>

      {message ? (
        <p className="mb-3 text-sm text-sage">{message}</p>
      ) : null}

      {/* Form */}
      {form}

      {/* Action list */}
      <div className="space-y-2">
        {actions
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((action, index) => (
            <div
              className={`flex w-full min-w-0 items-start gap-2 rounded-[1.35rem] border p-3 shadow-sm ${
                action.enabled
                  ? "border-white/80 bg-white/70"
                  : "border-white/50 bg-white/45 opacity-55"
              }`}
              key={action.id}
            >
              {/* Sort buttons */}
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-white/80 bg-white/60 text-xs text-[var(--app-muted)] hover:bg-white/90 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveAction(action.id, "up")}
                  type="button"
                >
                  ↑
                </button>
                <button
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-white/80 bg-white/60 text-xs text-[var(--app-muted)] hover:bg-white/90 disabled:opacity-30"
                  disabled={index === actions.length - 1}
                  onClick={() => moveAction(action.id, "down")}
                  type="button"
                >
                  ↓
                </button>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      action.type === "internal"
                        ? "bg-skySoft/70"
                        : action.type === "external"
                          ? "bg-sage/50"
                          : "bg-roseSoft/70"
                    }`}
                  >
                    {action.type === "internal"
                      ? "页面"
                      : action.type === "external"
                        ? "外链"
                        : "操作"}
                  </span>
                  <span className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {action.label}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--app-muted)]">
                  {action.type === "internal"
                    ? action.href
                    : action.type === "external"
                      ? action.href
                      : action.action
                        ? getActionSubtitle(action.action)
                        : ""}
                </div>
              </div>

              {/* Toggle */}
              <button
                className={`shrink-0 rounded-lg border px-2 py-1 text-xs transition ${
                  action.enabled
                    ? "border-sage/60 bg-sage/30 text-sage"
                    : "border-white/80 bg-white/60 text-[var(--app-muted)]"
                }`}
                onClick={() => toggleEnabled(action.id)}
                type="button"
              >
                {action.enabled ? "显示" : "隐藏"}
              </button>

              {/* Edit */}
              <button
                className="shrink-0 rounded-lg border border-white/80 bg-white/60 px-2 py-1 text-xs text-[var(--app-muted)] hover:bg-white/90"
                onClick={() => startEdit(action)}
                type="button"
              >
                编辑
              </button>

              {/* Delete */}
              <button
                className="shrink-0 rounded-lg border border-white/80 bg-white/60 px-2 py-1 text-xs text-[var(--app-muted)] hover:bg-red-50 hover:text-red-500"
                onClick={() => deleteAction(action.id)}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
      </div>
    </SettingsSection>
  );
}