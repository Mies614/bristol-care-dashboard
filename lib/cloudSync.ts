"use client";

import type { AppData, LoveNote } from "./types";
import { loadAppData, saveAppData } from "./storage";
import { validateAppData } from "./validation";

const CLOUD_CONNECTION_KEY = "bristol-care-cloud-connection-v1";
const LAST_SYNC_KEY = "bristol-care-last-sync-v1";

export type CloudConnection = {
  code: string;
};

export type CloudResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  step?: string;
  detail?: string;
};

async function postJson<T>(url: string, body: unknown): Promise<CloudResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: payload.error || "请求失败。",
        code: payload.code,
        step: payload.step,
        detail: payload.detail
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "网络连接失败，本地数据已保留。" };
  }
}

export function isCloudConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getDefaultSpaceCode() {
  return process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "xiaoguai520";
}

export async function getSpaceByCode(code: string) {
  return postJson<{ space: { code: string; name: string; girlfriendName: string } }>("/api/cloud/space", { code });
}

export async function pullCloudData(code: string): Promise<CloudResult<AppData>> {
  const result = await postJson<{ data: unknown }>("/api/cloud/pull", { code });
  if (!result.ok) return { ok: false, error: result.error, code: result.code, step: result.step, detail: result.detail };
  try {
    return { ok: true, data: validateAppData(result.data?.data) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "云端数据格式不正确。" };
  }
}

export async function uploadLocalDataToCloud(code: string, localData: AppData) {
  return postJson<{ data: AppData }>("/api/cloud/upload", { code, data: localData, mode: "uploadLocalToCloud" });
}

export async function syncLoveNotes(code: string): Promise<CloudResult<LoveNote[]>> {
  const result = await postJson<{ loveNotes: LoveNote[] }>("/api/cloud/love-notes", { code });
  if (!result.ok) return { ok: false, error: result.error, code: result.code, step: result.step, detail: result.detail };
  return { ok: true, data: result.data?.loveNotes || [] };
}

export async function syncSettings(code: string): Promise<CloudResult<AppData>> {
  return pullCloudData(code);
}

export function saveCloudConnection(code: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLOUD_CONNECTION_KEY, JSON.stringify({ code }));
  } catch {
    // Cloud connection is optional; local mode remains usable.
  }
}

export function clearCloudConnection() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLOUD_CONNECTION_KEY);
    window.localStorage.removeItem(LAST_SYNC_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getCloudConnection(): CloudConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOUD_CONNECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getLastSyncTime() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncTime(value = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, value);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getCloudSyncStatus() {
  if (!isCloudConfigured()) return "云同步未配置，本地模式可继续使用";
  const connection = getCloudConnection();
  if (!connection) return "未连接";
  const lastSync = getLastSyncTime();
  return lastSync ? `已连接 ${connection.code}，最近同步 ${new Date(lastSync).toLocaleString("zh-CN")}` : `已连接 ${connection.code}`;
}

export async function pullAndPersistCloudData(code: string): Promise<CloudResult<AppData>> {
  const result = await pullCloudData(code);
  if (!result.ok || !result.data) return result;
  try {
    saveAppData(result.data);
    setLastSyncTime();
  } catch {
    return { ok: false, error: "云端数据已拉取，但本地缓存写入失败。" };
  }
  return result;
}

export async function refreshFromSavedConnection(): Promise<CloudResult<AppData>> {
  const connection = getCloudConnection();
  if (!connection) return { ok: false, error: "未连接云同步。" };
  const before = loadAppData();
  const result = await pullAndPersistCloudData(connection.code);
  if (!result.ok) saveAppData(before);
  return result;
}

export async function syncLoveNotesIntoLocalData(code: string): Promise<CloudResult<AppData>> {
  const result = await syncLoveNotes(code);
  if (!result.ok || !result.data) return { ok: false, error: result.error, code: result.code, step: result.step, detail: result.detail };
  const current = loadAppData();
  const next = {
    ...current,
    loveNotes: result.data,
    note: result.data[0]?.content || current.note
  };
  try {
    saveAppData(next);
    setLastSyncTime();
  } catch {
    return { ok: false, error: "小纸条已拉取，但本地缓存写入失败。" };
  }
  return { ok: true, data: next };
}
