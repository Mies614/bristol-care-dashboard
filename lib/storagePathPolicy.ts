import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { normalizeSpaceCode } from "@/lib/spaceCode";

export type StorageIdentity = "me" | typeof DEFAULT_NORMAL_IDENTITY_ID;
export type StorageKind = "images" | "videos" | "audio" | "backgrounds";

const EXTENSION_PATTERN = /^[a-z0-9]{1,12}$/;
const SAFE_SPACE_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertSafePart(name: string, value: string, pattern: RegExp): void {
  if (!pattern.test(value) || value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new Error(`${name} 路径片段不安全。`);
  }
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new Error("当前环境不支持安全 UUID 生成。");
}

export function normalizeStorageIdentity(identity?: string | null): StorageIdentity {
  return identity === "me" ? "me" : DEFAULT_NORMAL_IDENTITY_ID;
}

export function buildImmutableStoragePath(input: {
  spaceCode: string;
  identity?: string | null;
  kind: StorageKind;
  extension: string;
  now?: Date;
  uuid?: string;
}): string {
  const spaceCode = normalizeSpaceCode(input.spaceCode);
  const identity = normalizeStorageIdentity(input.identity);
  const extension = input.extension.toLowerCase().replace(/^\./, "");
  const uuid = input.uuid || makeUuid();
  const now = input.now || new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");

  assertSafePart("spaceCode", spaceCode, SAFE_SPACE_PATTERN);
  assertSafePart("identity", identity, /^(me|xiaoguai)$/);
  assertSafePart("kind", input.kind, /^(images|videos|audio|backgrounds)$/);
  assertSafePart("year", year, /^\d{4}$/);
  assertSafePart("month", month, /^\d{2}$/);
  assertSafePart("uuid", uuid, UUID_PATTERN);
  assertSafePart("extension", extension, EXTENSION_PATTERN);

  return `${spaceCode}/${identity}/${year}/${month}/${input.kind}/${uuid}.${extension}`;
}

export function isImmutableStoragePath(path: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 6) return false;
  const [spaceCode, identity, year, month, kind, fileName] = parts;
  if (!spaceCode || !identity || !year || !month || !kind || !fileName) return false;
  if (!SAFE_SPACE_PATTERN.test(spaceCode)) return false;
  if (!/^(me|xiaoguai)$/.test(identity)) return false;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return false;
  if (!/^(images|videos|audio|backgrounds)$/.test(kind)) return false;
  const [uuid, extension, extra] = fileName.split(".");
  return !extra && UUID_PATTERN.test(uuid) && EXTENSION_PATTERN.test(extension || "");
}
