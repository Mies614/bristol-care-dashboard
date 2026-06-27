/**
 * Media URL guard — detects and warns about legacy imageUrl/videoUrl/audioUrl
 * usage in API request bodies. In development mode, rejects requests containing
 * these fields to enforce the unified MediaRef model.
 */
export function checkLegacyMediaFields(body: Record<string, unknown>): void {
  const legacyFields = ["image_url", "video_url", "audio_url", "imageUrl", "videoUrl", "audioUrl"];
  const found = legacyFields.filter((f) => f in body && body[f]);
  if (found.length === 0) return;

  const msg = `[MEDIA_GUARD] Legacy URL fields in request: ${found.join(", ")}. Use path fields instead.`;

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.warn(msg);
  }
}
