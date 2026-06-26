/**
 * Client-side download helper for private media.
 *
 * Flow:
 * 1. Calls GET /api/media/download?contentType=...&contentId=...&field=...
 * 2. Receives signed download URL from server
 * 3. Fetches the blob via the signed URL
 * 4. Creates a temporary anchor element to trigger browser download
 *
 * Does NOT use window.open, location.href, or direct href on the signed URL.
 */

export type DownloadType = "image" | "video" | "audio";

export type DownloadParams = {
  contentType: "note" | "album";
  contentId: string;
  field: DownloadType;
};

export async function downloadPrivateMedia(params: DownloadParams): Promise<void> {
  // 1. Get signed download URL from API
  const res = await fetch(
    `/api/media/download?contentType=${encodeURIComponent(params.contentType)}&contentId=${encodeURIComponent(params.contentId)}&field=${encodeURIComponent(params.field)}`,
    { credentials: "include" },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "下载失败，请稍后重试。");
  }

  const json = await res.json();
  if (!json.ok || !json.signedUrl) {
    throw new Error("下载链接获取失败。");
  }

  // 2. Fetch the file via signed URL
  const fileRes = await fetch(json.signedUrl);
  if (!fileRes.ok) {
    throw new Error("文件下载失败。");
  }

  // 3. Create blob and trigger download
  const blob = await fileRes.blob();
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = json.filename || "download";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
