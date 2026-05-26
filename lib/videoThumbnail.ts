"use client";

export function shouldGenerateVideoThumbnail(imageFile?: File | null, videoFile?: File | null) {
  return Boolean(videoFile && !imageFile);
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "seeked", timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("视频封面生成超时。"));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("视频无法读取，暂时不能生成封面。"));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener("error", onError);
    };
    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

export async function generateVideoThumbnail(file: File): Promise<Blob> {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("当前环境不支持生成视频封面。");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = objectUrl;

  try {
    await waitForVideoEvent(video, "loadedmetadata", 10000);
    const targetTime = Number.isFinite(video.duration) && video.duration > 0.2 ? 0.1 : 0;
    video.currentTime = targetTime;
    await waitForVideoEvent(video, "seeked", 10000);

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器不能绘制视频封面。");
    context.drawImage(video, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("视频封面导出失败。"));
      }, "image/jpeg", 0.86);
    });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createThumbnailFileFromVideo(videoFile: File): Promise<File> {
  const blob = await generateVideoThumbnail(videoFile);
  return new File([blob], `video-thumbnail-${Date.now()}.jpg`, { type: "image/jpeg" });
}
