"use client";

import { useCallback, useEffect, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { ADMIN_IDENTITY_ID, getIdentityLabel, getIdentityAvatarEmoji } from "@/lib/identity";

interface CommentRecord {
  id: string;
  contentType: string;
  contentId: string;
  identity: string;
  body: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InteractionRecord {
  id: string;
  contentType: string;
  contentId: string;
  identity: string;
  interactionType: string;
  reaction?: string;
  createdAt: string;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  comments?: CommentRecord[];
  interactions?: InteractionRecord[];
  [key: string]: unknown;
}

export function CommentsModerationTab({ password }: { password: string }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterId, setFilterId] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [supabaseUnavailable, setSupabaseUnavailable] = useState(false);

  const code = getDefaultSpaceCode();

  const fetchAll = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const [commentsRes, interactionsRes] = await Promise.all([
        fetch(
          `/api/admin/comments/all?code=${encodeURIComponent(code)}&includeDeleted=${showDeleted}`,
          { headers: { "x-admin-password": password } }
        ),
        fetch(
          `/api/admin/interactions/all?code=${encodeURIComponent(code)}`,
          { headers: { "x-admin-password": password } }
        ),
      ]);
      // Detect Supabase unavailable from HTTP status
      if (commentsRes.status === 503 || interactionsRes.status === 503) {
        setSupabaseUnavailable(true);
        setLoading(false);
        return;
      }
      setSupabaseUnavailable(false);

      const commentsPayload = await commentsRes.json() as ApiResponse;
      const interactionsPayload = await interactionsRes.json() as ApiResponse;

      if (commentsPayload.ok && Array.isArray(commentsPayload.comments)) {
        setComments(commentsPayload.comments);
      } else if (commentsPayload.error) {
        setMessage(`评论加载：${commentsPayload.error}`);
      }

      if (interactionsPayload.ok && Array.isArray(interactionsPayload.interactions)) {
        setInteractions(interactionsPayload.interactions);
      }
    } catch (err) {
      setMessage(`加载失败：${err instanceof Error ? err.message : "网络错误"}`);
    } finally {
      setLoading(false);
    }
  }, [code, password, showDeleted]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRestoreComment = async (commentId: string) => {
    try {
      const res = await fetch("/api/admin/comments/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ code, commentId }),
      });
      const p = await res.json() as ApiResponse;
      if (p.ok) {
        setMessage("评论已恢复。");
        fetchAll();
      } else {
        setMessage(p.error || "恢复失败");
      }
    } catch {
      setMessage("恢复请求失败");
    }
  };

  const handleHardDeleteComment = async (commentId: string) => {
    if (!confirm("确定永久删除这条评论吗？此操作不可撤销。")) return;
    try {
      const res = await fetch("/api/admin/comments/hard-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ code, commentId }),
      });
      const p = await res.json() as ApiResponse;
      if (p.ok) {
        setMessage("评论已永久删除。");
        fetchAll();
      } else {
        setMessage(p.error || "删除失败");
      }
    } catch {
      setMessage("删除请求失败");
    }
  };

  const handleSoftDelete = async (commentId: string) => {
    if (!confirm("确定删除这条评论吗？可恢复。")) return;
    try {
      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ code, commentId, identity: ADMIN_IDENTITY_ID }),
      });
      const p = await res.json() as ApiResponse;
      if (p.ok) {
        setMessage("评论已删除（可恢复）。");
        fetchAll();
      } else {
        setMessage(p.error || "删除失败");
      }
    } catch {
      setMessage("删除请求失败");
    }
  };

  // Filter and sort
  const filteredComments = comments
    .filter((c) => !filterType || c.contentType === filterType)
    .filter((c) => !filterId || c.contentId.includes(filterId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Interaction stats
  const likeCount = interactions.filter((i) => i.interactionType === "like").length;
  const readCount = interactions.filter((i) => i.interactionType === "read").length;
  const reactionCount = interactions.filter((i) => i.interactionType === "reaction").length;

  const uniqueContentTypes = [...new Set(comments.map((c) => c.contentType))];
  const deletedCount = comments.filter((c) => c.deletedAt).length;

  return (
    <div className="space-y-4">
      {supabaseUnavailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
          ⚠️ Supabase 未配置或不可用，无法加载评论和互动数据。
          <button
            className="ml-2 underline hover:text-amber-600"
            onClick={fetchAll}
          >
            重试
          </button>
        </div>
      )}
      {/* Interaction Stats */}
      <div className="rounded-lg bg-white/55 p-3">
        <p className="text-xs font-medium text-cocoa/60 mb-2">📊 互动统计</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-cocoa/50">
          <div className="rounded-md bg-white/50 px-2 py-1.5 text-center">
            <span className="block text-sm font-semibold text-sage">{readCount}</span>
            <span>已读</span>
          </div>
          <div className="rounded-md bg-white/50 px-2 py-1.5 text-center">
            <span className="block text-sm font-semibold text-rose">{likeCount}</span>
            <span>点赞</span>
          </div>
          <div className="rounded-md bg-white/50 px-2 py-1.5 text-center">
            <span className="block text-sm font-semibold text-amber">{reactionCount}</span>
            <span>表情</span>
          </div>
        </div>
        <p className="mt-1 text-[10px] text-cocoa/30">互动总数：{interactions.length} 条</p>
      </div>

      {/* Comment Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="rounded-lg border border-white/80 bg-white/55 px-2 py-1 text-xs text-cocoa"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">全部类型</option>
          {uniqueContentTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          className="rounded-lg border border-white/80 bg-white/55 px-2 py-1 text-xs text-cocoa placeholder:text-cocoa/30 w-36"
          placeholder="按 contentId 筛选"
          value={filterId}
          onChange={(e) => setFilterId(e.target.value)}
        />
        <label className="flex items-center gap-1 text-[10px] text-cocoa/50">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded"
          />
          显示已删除
        </label>
        <AppButton variant="secondary" size="sm" onClick={fetchAll} disabled={loading}>
          🔄 刷新
        </AppButton>
      </div>

      {/* Comment count */}
      <p className="text-xs text-cocoa/40">
        共 {filteredComments.length} 条评论（已删除 {deletedCount} 条）
      </p>

      {/* Comment List */}
      {loading ? (
        <p className="text-xs text-cocoa/40">加载中...</p>
      ) : filteredComments.length === 0 ? (
        <p className="text-xs text-cocoa/40">暂无评论数据。</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-auto">
          {filteredComments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                c.deletedAt
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-white/80 bg-white/55"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-cocoa/60">
                    <span>{getIdentityAvatarEmoji(c.identity)} </span>
                    {getIdentityLabel(c.identity)}
                  </span>
                  <span className="text-[10px] text-cocoa/30">{c.contentType}</span>
                  {c.deletedAt && (
                    <span className="text-[10px] text-rose/60">已删除</span>
                  )}
                </div>
                <span className="text-[10px] text-cocoa/30">
                  {new Date(c.createdAt).toLocaleString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-cocoa/70 break-words">{c.body}</p>
              <p className="text-[10px] text-cocoa/30 mt-1 truncate">ID: {c.contentId}</p>
              <div className="flex gap-2 mt-1.5">
                {c.deletedAt ? (
                  <button
                    className="text-[10px] text-sage hover:underline"
                    onClick={() => handleRestoreComment(c.id)}
                  >
                    恢复
                  </button>
                ) : (
                  <button
                    className="text-[10px] text-rose/60 hover:underline"
                    onClick={() => handleSoftDelete(c.id)}
                  >
                    删除
                  </button>
                )}
                <button
                  className="text-[10px] text-rose/40 hover:underline"
                  onClick={() => handleHardDeleteComment(c.id)}
                >
                  永久删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-2 text-xs text-[var(--app-text)] break-words">
          {message}
        </div>
      )}
    </div>
  );
}