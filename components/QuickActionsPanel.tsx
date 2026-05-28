"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getDefaultSpaceCode,
  isCloudConfigured,
  pullAndPersistCloudData,
} from "@/lib/cloudSync";
import {
  type QuickAction,
  DEFAULT_QUICK_ACTIONS,
  getVisibleQuickActions,
  getActionSubtitle,
  getActionLucideIcon,
  MAX_VISIBLE_ACTIONS,
} from "@/lib/quickActions";

// ── Lucide icon mapping ──

function ActionIcon({ icon }: { icon?: string }) {
  const iconName = getActionLucideIcon(icon as never);
  // Simple inline SVG icons for common actions to avoid dynamic import complexity
  const icons: Record<string, string> = {
    Pencil: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
    Camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
    Calendar: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18",
    Heart: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
    CreditCard: "M2 10h20 M2 14h20 M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z",
    Sparkles: "M12 3v4m0 10v4m-7-7h4m6 0h4m-5.5-5.5l-1.5 1.5m0 4l1.5 1.5M8.5 8.5L7 7m10 10l-1.5-1.5",
    Link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    Star: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z",
    Clock: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-14h-2v7l4.5 2.68.75-1.3L13 12.3z",
    FileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M16 2v6h6 M8 13h8 M8 17h8 M8 9h1",
  };

  const path = icons[iconName] || icons.Link;
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

// ── Color theme mapping ──

function getActionColor(color: string | undefined): string {
  const map: Record<string, { bg: string; text: string }> = {
    rose: { bg: "bg-roseSoft/75", text: "text-cocoa" },
    sage: { bg: "bg-sage/45", text: "text-cocoa" },
    butter: { bg: "bg-butter/75", text: "text-cocoa" },
    lilac: { bg: "bg-lilac/65", text: "text-cocoa" },
    skySoft: { bg: "bg-skySoft/80", text: "text-cocoa" },
    cocoa: { bg: "bg-cocoa/10", text: "text-cocoa" },
    blush: { bg: "bg-blush/65", text: "text-cocoa" },
    cream: { bg: "bg-cream/80", text: "text-cocoa" },
    mint: { bg: "bg-mint/65", text: "text-cocoa" },
  };
  return (color && map[color]?.bg) || "bg-white/80";
}

// ── Main Panel ──

interface QuickActionsPanelProps {
  /** 当 miss_you 操作触发时，父组件可以设置反馈信息 */
  onMissYouFeedback?: (msg: string) => void;
  /** 外部传入的 miss_you 按钮动画状态 */
  missYouAnimating?: boolean;
}

export function QuickActionsPanel({
  onMissYouFeedback,
}: QuickActionsPanelProps) {
  const [actions, setActions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [missYouLoading, setMissYouLoading] = useState(false);

  // Load quick actions from settings via cloud or local
  const loadActions = useCallback(async () => {
    try {
      // Try to get quick_actions from cloud sync
      if (isCloudConfigured()) {
        try {
          const connection = await import("@/lib/cloudSync").then((m) =>
            m.getCloudConnection()
          );
          if (connection) {
            const result = await pullAndPersistCloudData(connection.code);
            if (result.ok && result.data) {
              // Quick actions may exist in localStorage
              const savedActionsRaw =
                typeof window !== "undefined"
                  ? window.localStorage.getItem(
                      "bristol_dashboard_quick_actions"
                    )
                  : null;

              if (savedActionsRaw) {
                try {
                  const parsed = JSON.parse(savedActionsRaw) as QuickAction[];
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setActions(parsed);
                    return;
                  }
                } catch {
                  // fall through
                }
              }
            }
          }
        } catch {
          // cloud sync failed, use local fallback
        }
      }

      // Local fallback: check if we have quick_actions saved
      const savedActionsRaw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("bristol_dashboard_quick_actions")
          : null;

      if (savedActionsRaw) {
        try {
          const parsed = JSON.parse(savedActionsRaw) as QuickAction[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActions(parsed);
            return;
          }
        } catch {
          // fall through
        }
      }

      // Final fallback: use defaults
      setActions(DEFAULT_QUICK_ACTIONS);
    } catch {
      setActions(DEFAULT_QUICK_ACTIONS);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const visibleActions = getVisibleQuickActions(actions);
  const hasMore = actions.filter((a) => a.enabled).length > MAX_VISIBLE_ACTIONS;

  // Handle miss_you action
  async function handleMissYou() {
    if (missYouLoading) return;
    setMissYouLoading(true);
    setPendingActions((prev) => new Set(prev).add("miss_you"));

    try {
      const code = getDefaultSpaceCode();
      const localDate = new Date().toISOString().split("T")[0];
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          author: "xiaoguai",
          recipient: "admin",
          localDate,
        }),
      });
      const payload = await response.json();

      if (payload.ok) {
        onMissYouFeedback?.("收到啦，这一下会被好好收起来。");
      } else {
        onMissYouFeedback?.("已经先帮你记在本地，稍后再同步。");
      }
    } catch {
      onMissYouFeedback?.("已经先帮你记在本地，稍后再同步。");
    } finally {
      setMissYouLoading(false);
      setTimeout(
        () => setPendingActions((prev) => {
          const next = new Set(prev);
          next.delete("miss_you");
          return next;
        }),
        600
      );
    }
  }

  // Render a single action card
  function renderAction(action: QuickAction) {
    const isPending = pendingActions.has(action.id) || pendingActions.has("miss_you");
    const isLoading = isPending || (action.action === "miss_you" && missYouLoading);

    // Miss you action — button
    if (action.type === "action" && action.action === "miss_you") {
      return (
        <button
          key={action.id}
          className={`flex w-full min-w-0 items-center gap-2.5 rounded-[1.35rem] border border-white/80 p-3 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 active:translate-y-0 ${getActionColor(action.color)} ${isLoading ? "scale-95 opacity-60" : ""}`}
          disabled={isLoading}
          onClick={handleMissYou}
          type="button"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/70 shadow-sm">
            <ActionIcon icon={action.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--app-text)]">
              {action.label}
            </div>
            <div className="truncate text-xs text-[var(--app-muted)]">
              {getActionSubtitle(action.action)}
            </div>
          </div>
          {isLoading && (
            <span className="shrink-0 text-xs text-[var(--app-muted)] animate-pulse">
              ...
            </span>
          )}
        </button>
      );
    }

    // External link
    if (action.type === "external" && action.href) {
      return (
        <a
          key={action.id}
          className={`flex w-full min-w-0 items-center gap-2.5 rounded-[1.35rem] border border-white/80 p-3 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 ${getActionColor(action.color)}`}
          href={action.href}
          target="_blank"
          rel="noreferrer"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/70 shadow-sm">
            <ActionIcon icon={action.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--app-text)]">
              {action.label}
            </div>
            <div className="truncate text-xs text-[var(--app-muted)]">
              外部链接
            </div>
          </div>
          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3" />
          </svg>
        </a>
      );
    }

    // Internal link
    return (
      <Link
        key={action.id}
        className={`flex w-full min-w-0 items-center gap-2.5 rounded-[1.35rem] border border-white/80 p-3 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 ${getActionColor(action.color)}`}
        href={action.href || "/"}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/70 shadow-sm">
            <ActionIcon icon={action.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--app-text)]">
            {action.label}
          </div>
          <div className="truncate text-xs text-[var(--app-muted)]">
            {action.action ? getActionSubtitle(action.action) : "快速入口"}
          </div>
        </div>
        <svg className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M5 12h14 M12 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  if (!visibleActions.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-kicker mb-1">Quick Actions</p>
          <h2 className="font-semibold text-cocoa">快捷动作</h2>
        </div>
        <Link className="text-sm text-sage" href="/settings">
          管理
        </Link>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleActions.map(renderAction)}
      </div>

      {hasMore && (
        <div className="text-center">
          <Link className="text-xs text-[var(--app-muted)] hover:text-sage" href="/settings">
            还有更多快捷动作，去设置管理 →
          </Link>
        </div>
      )}
    </section>
  );
}