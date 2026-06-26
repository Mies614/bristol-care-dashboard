import { signedUpload, type SignedUploadResult } from "./signedUpload";

export type UploadedNoteMedia = SignedUploadResult;

export async function uploadNoteMediaDirectly(
  file: File | Blob,
  kind: "images" | "videos" | "audio",
  _code: string,
  _identity?: string,
): Promise<UploadedNoteMedia> {
  const mediaKind = kind === "images" ? "image" : kind === "videos" ? "video" : "audio";
  return signedUpload(file, "love-notes", mediaKind);
}
