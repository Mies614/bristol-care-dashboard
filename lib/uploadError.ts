/**
 * Upload error classification and friendly messages.
 * Pure utility — no React, no Supabase client, no side effects.
 */

export type UploadErrorKind =
  | "network"
  | "supabase_missing"
  | "file_too_large"
  | "file_type_unsupported"
  | "timeout"
  | "storage_full"
  | "server_error"
  | "unknown";

export interface UploadErrorInfo {
  kind: UploadErrorKind;
  friendlyMessage: string;
  canRetry: boolean;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const AUDIO_TYPES = ["audio/mp4", "audio/mpeg", "audio/wav", "audio/webm", "audio/aac"];

export function classifyUploadError(
  error: unknown,
  context: { fileKind?: "image" | "video" | "audio"; fileSize?: number; fileType?: string } = {}
): UploadErrorInfo {
  const msg = extractErrorMessage(error);

  // Supabase client not configured
  if (msg.includes("Supabase publishable client 未配置") || msg.includes("getSupabaseBrowserClient() returned null")) {
    return {
      kind: "supabase_missing",
      friendlyMessage: "云存储未配置，文件已保留在本地。可以先连接云同步后再上传。",
      canRetry: true,
    };
  }

  // Network errors
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("network") ||
    msg.includes("ERR_CONNECTION") ||
    msg.includes("fetch failed")
  ) {
    return {
      kind: "network",
      friendlyMessage: "网络连接失败，上传未能完成。内容已保留，联网后可重试。",
      canRetry: true,
    };
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("超时")) {
    return {
      kind: "timeout",
      friendlyMessage: "上传超时，可能是文件较大或网络较慢。内容已保留，可稍后重试。",
      canRetry: true,
    };
  }

  // File too large — from validation message
  if (msg.includes("不能超过") || msg.includes("太大") || msg.includes("too large") || msg.includes("过大")) {
    return {
      kind: "file_too_large",
      friendlyMessage: msg,
      canRetry: false,
    };
  }

  // Check file size against known limits
  if (context.fileSize && context.fileKind) {
    const maxSize = context.fileKind === "image" ? MAX_IMAGE_SIZE : context.fileKind === "video" ? MAX_VIDEO_SIZE : MAX_AUDIO_SIZE;
    if (context.fileSize > maxSize) {
      return {
        kind: "file_too_large",
        friendlyMessage: `文件过大（${formatSize(context.fileSize)}），${context.fileKind === "image" ? "图片" : context.fileKind === "video" ? "视频" : "语音"}最大支持 ${formatSize(maxSize)}。`,
        canRetry: false,
      };
    }
  }

  // File type unsupported
  if (msg.includes("不支持") || msg.includes("只支持") || msg.includes("格式") || msg.includes("format") || msg.includes("mime type")) {
    return {
      kind: "file_type_unsupported",
      friendlyMessage: msg,
      canRetry: false,
    };
  }

  // Check file type against known allowed types
  if (context.fileType && context.fileKind) {
    const allowed = context.fileKind === "image" ? IMAGE_TYPES : context.fileKind === "video" ? VIDEO_TYPES : AUDIO_TYPES;
    if (!allowed.includes(context.fileType)) {
      return {
        kind: "file_type_unsupported",
        friendlyMessage: `不支持该文件类型（${context.fileType}），${context.fileKind === "image" ? "图片" : context.fileKind === "video" ? "视频" : "语音"}支持常见格式。`,
        canRetry: false,
      };
    }
  }

  // Storage full
  if (msg.includes("storage") && (msg.includes("full") || msg.includes("quota") || msg.includes("limit"))) {
    return {
      kind: "storage_full",
      friendlyMessage: "云端存储空间不足，请清理空间后重试。",
      canRetry: true,
    };
  }

  // Server errors
  if (msg.includes("500") || msg.includes("503") || msg.includes("server") || msg.includes("internal")) {
    return {
      kind: "server_error",
      friendlyMessage: "服务器暂时不可用，内容已保留，稍后可以重试。",
      canRetry: true,
    };
  }

  // Unknown — generic message, allow retry
  return {
    kind: "unknown",
    friendlyMessage: msg ? `上传失败：${msg.length > 100 ? msg.slice(0, 100) + "..." : msg}` : "上传失败，内容已保留，可以重试。",
    canRetry: true,
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, unknown>).message as string;
  }
  return "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
