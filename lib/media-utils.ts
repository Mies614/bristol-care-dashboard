/**
 * Clean up a video element by pausing, removing its src, and calling load()
 * to free resources. Safe to call with null.
 */
export function cleanupVideoElement(video: HTMLVideoElement | null): void {
  if (!video) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}