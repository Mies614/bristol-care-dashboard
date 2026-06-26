import { signedUpload, type SignedUploadResult } from "./signedUpload";
import { determineAlbumItemType } from "./albumValidation";
import type { AlbumItem } from "./types";

export type UploadedAlbumFile = SignedUploadResult;

export type AlbumUploadDraft = {
  title: string;
  note: string;
  takenAt: string;
  location: string;
  isFavorite: boolean;
};

export type AlbumMetadataPayload = {
  code: string;
  title: string;
  note: string;
  taken_at: string;
  location: string;
  is_favorite: boolean;
  type: AlbumItem["type"];
  image_url?: string;
  image_path?: string;
  video_url?: string;
  video_path?: string;
  file_size: number;
  created_by?: string;
};

export async function uploadAlbumFileDirectly(
  file: File,
  kind: "image" | "video",
  _code: string,
  _identity?: string,
): Promise<UploadedAlbumFile> {
  return signedUpload(file, "couple-albums", kind);
}

export function buildAlbumMetadataPayload(input: {
  code: string;
  draft: AlbumUploadDraft;
  imageUpload?: UploadedAlbumFile | null;
  videoUpload?: UploadedAlbumFile | null;
  createdBy?: string;
  typeOverride?: AlbumItem["type"];
}): AlbumMetadataPayload {
  const { code, draft, imageUpload, videoUpload, createdBy, typeOverride } = input;
  return {
    code,
    title: draft.title,
    note: draft.note,
    taken_at: draft.takenAt ? new Date(draft.takenAt).toISOString() : "",
    location: draft.location,
    is_favorite: draft.isFavorite,
    type: typeOverride || determineAlbumItemType(Boolean(imageUpload), Boolean(videoUpload)),
    image_url: imageUpload?.url,
    image_path: imageUpload?.path,
    video_url: videoUpload?.url,
    video_path: videoUpload?.path,
    file_size: (imageUpload?.size || 0) + (videoUpload?.size || 0),
    created_by: createdBy,
  };
}
