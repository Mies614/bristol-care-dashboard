"use client";

import { useCallback, useEffect, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import {
  loadIdentities,
  saveIdentity,
  deleteIdentity,
  setCurrentIdentity,
  getCurrentIdentityId,
  getCurrentIdentity,
  isIdentityCloudAvailable,
  type UserIdentity,
} from "@/lib/identityStorage";
import {
  getIdentityLabel,
  getIdentityAvatarEmoji,
  DEFAULT_NORMAL_IDENTITY_ID,
} from "@/lib/identity";
import { getDefaultSpaceCode } from "@/lib/cloudSync";

const BUILT_IN_IDS = ["xiaoguai", "me", "admin"];

export function IdentitySettingsCard() {
  const spaceCode = getDefaultSpaceCode();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [currentId, setCurrentId] = useState<string>(DEFAULT_NORMAL_IDENTITY_ID);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [loading, setLoading] = useState(true);
  const cloudAvailable = isIdentityCloudAvailable();

  const currentIdentity = identities.find((id) => id.id === currentId);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await loadIdentities(spaceCode);
      setIdentities(ids);
      const cid = getCurrentIdentityId(spaceCode);
      setCurrentId(cid);
    } finally {
      setLoading(false);
    }
  }, [spaceCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSwitch(id: string) {
    setCurrentIdentity(spaceCode, id);
    setCurrentId(id);
    const current = await getCurrentIdentity(spaceCode);
    setMessage(`你现在以「${current.displayName}」的身份留下评论和喜欢。`);
  }

  async function handleSaveEdit(id: string) {
    const identity = identities.find((i) => i.id === id);
    if (!identity) return;
    const updated: UserIdentity = {
      ...identity,
      displayName: editName || identity.displayName,
      avatarEmoji: editEmoji || identity.avatarEmoji || undefined,
      updatedAt: new Date().toISOString(),
    };
    await saveIdentity(spaceCode, updated);
    setEditingId(null);
    setEditName("");
    setEditEmoji("");
    await refresh();
    setMessage("身份信息已保存。");
  }

  async function handleCreate() {
    const rawId = newName.trim();
    if (!rawId) return;
    // Generate a stable id slug from display name
    const generatedId = rawId
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "") || `identity-${Date.now()}`;

    const existing = identities.find((i) => i.id === generatedId);
    if (existing) {
      setMessage("该身份已存在。");
      return;
    }

    const newIdentity: UserIdentity = {
      id: generatedId,
      displayName: rawId,
      role: "partner",
      avatarEmoji: newEmoji || undefined,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveIdentity(spaceCode, newIdentity);
    setNewName("");
    setNewEmoji("");
    await refresh();
    setMessage(`已创建身份「${rawId}」。`);
  }

  async function handleDelete(id: string) {
    if (BUILT_IN_IDS.includes(id)) {
      setMessage("内建身份不可删除，可以隐藏或改名。");
      return;
    }
    if (!confirm(`确定删除身份「${getIdentityLabel(id, identities)}」吗？`)) return;
    await deleteIdentity(spaceCode, id);
    // If we deleted the current identity, switch back to default
    if (currentId === id) {
      setCurrentIdentity(spaceCode, DEFAULT_NORMAL_IDENTITY_ID);
      setCurrentId(DEFAULT_NORMAL_IDENTITY_ID);
    }
    await refresh();
    setMessage("身份已删除。");
  }

  async function handleSetDefault(id: string) {
    // Clear all defaults first
    for (const idObj of identities) {
      if (idObj.isDefault && idObj.id !== id) {
        await saveIdentity(spaceCode, { ...idObj, isDefault: false, updatedAt: new Date().toISOString() });
      }
    }
    const target = identities.find((i) => i.id === id);
    if (target) {
      await saveIdentity(spaceCode, { ...target, isDefault: true, updatedAt: new Date().toISOString() });
    }
    await refresh();
    setMessage(`已将「${getIdentityLabel(id, identities)}」设为默认身份。`);
  }

  if (loading) {
    return (
      <AppCard className="shadow-sm">
        <p className="text-sm text-[var(--app-muted)]">加载身份设置...</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current identity */}
      <AppCard className="shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{currentIdentity?.avatarEmoji || getIdentityAvatarEmoji(currentId, identities) || "💬"}</span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">
              当前身份：{currentIdentity?.displayName || getIdentityLabel(currentId, identities)}
            </p>
            {currentIdentity?.role === "admin" ? (
              <p className="text-xs text-[var(--app-muted)]">管理员身份</p>
            ) : currentIdentity?.role === "self" ? (
              <p className="text-xs text-[var(--app-muted)]">切换身份后，新的已读、点赞和评论会按这个身份记录。</p>
            ) : (
              <p className="text-xs text-[var(--app-muted)]">你现在以「{currentIdentity?.displayName || "小乖"}」的身份留下评论和喜欢。</p>
            )}
          </div>
        </div>
      </AppCard>

      {/* Identity list */}
      <AppCard className="shadow-sm">
        <p className="text-sm font-semibold text-[var(--app-text)] mb-3">身份列表</p>
        <div className="space-y-2">
          {identities
            .filter((id) => id.role !== "admin")
            .map((identity) => (
              <div
                key={identity.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition ${
                  currentId === identity.id
                    ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)]"
                    : "border-[var(--app-card-border)] bg-[var(--app-card-bg)]"
                }`}
              >
                {editingId === identity.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      className="w-20 text-sm"
                      value={editName}
                      placeholder={identity.displayName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Input
                      className="w-16 text-sm"
                      value={editEmoji}
                      placeholder={identity.avatarEmoji || "🐰"}
                      onChange={(e) => setEditEmoji(e.target.value)}
                    />
                    <AppButton variant="primary" size="sm" onClick={() => handleSaveEdit(identity.id)}>
                      保存
                    </AppButton>
                    <AppButton variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                      取消
                    </AppButton>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{identity.avatarEmoji || "💬"}</span>
                      <span className="text-sm text-[var(--app-text)] truncate">
                        {identity.displayName}
                        {identity.isDefault ? (
                          <span className="ml-1.5 text-[10px] text-[var(--app-accent)] font-medium">默认</span>
                        ) : null}
                      </span>
                      {currentId === identity.id && (
                        <span className="text-[10px] text-[var(--app-accent)] font-medium">当前</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {currentId !== identity.id && (
                        <AppButton variant="secondary" size="sm" onClick={() => handleSwitch(identity.id)}>
                          切换
                        </AppButton>
                      )}
                      {!identity.isDefault && identity.role === "partner" && (
                        <AppButton variant="secondary" size="sm" onClick={() => handleSetDefault(identity.id)}>
                          默认
                        </AppButton>
                      )}
                      <AppButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(identity.id);
                          setEditName(identity.displayName);
                          setEditEmoji(identity.avatarEmoji || "");
                        }}
                      >
                        ✏️
                      </AppButton>
                      {!BUILT_IN_IDS.includes(identity.id) && (
                        <AppButton variant="danger" size="sm" onClick={() => handleDelete(identity.id)}>
                          🗑
                        </AppButton>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </AppCard>

      {/* Create new identity */}
      <AppCard className="shadow-sm">
        <p className="text-sm font-semibold text-[var(--app-text)] mb-3">新增身份</p>
        <p className="text-xs text-[var(--app-muted)] mb-3">
          为未来多用户预留。新建的身份默认为普通伴侣身份。
        </p>
        <div className="flex items-center gap-2 mb-2">
          <Input
            className="flex-1 text-sm"
            placeholder="显示名称，如：小宝"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            className="w-20 text-sm"
            placeholder="Emoji"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
          />
        </div>
        <AppButton variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim()}>
          创建
        </AppButton>
      </AppCard>

      {/* Cloud status */}
      <AppCard className="shadow-sm opacity-75">
        <p className="text-xs text-[var(--app-muted)]">
          {cloudAvailable
            ? "身份设置已同步到云端，切换设备后自动恢复。"
            : "身份设置仅保存在本机。开启云同步后会自动上传。"}
        </p>
      </AppCard>

      {message ? (
        <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-text)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}