export type MediaKind = "image" | "audio" | "video";

export function uploadWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("上传超时")), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function getSafeExtension(file: Blob & { name?: string }, fallback = "bin") {
  const ext = file.name?.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]+$/.test(ext)) return ext;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type.includes("/")) return file.type.split("/")[1].replace(/[^a-z0-9]/gi, "").toLowerCase() || fallback;
  return fallback;
}

export function isLargeMediaFile(file: Blob, kind: MediaKind) {
  if (kind === "image") return file.size > 20 * 1024 * 1024;
  if (kind === "video") return file.size > 50 * 1024 * 1024;
  return false;
}

export function createUploadStageMessage(stage: "validate" | "upload_image" | "upload_audio" | "upload_video" | "save" | "done") {
  return {
    validate: "校验文件",
    upload_image: "上传图片",
    upload_audio: "上传语音",
    upload_video: "上传视频",
    save: "保存记录",
    done: "完成"
  }[stage];
}

export function timeoutForKind(kind: MediaKind) {
  if (kind === "image") return 60_000;
  if (kind === "audio") return 90_000;
  return 180_000;
}
