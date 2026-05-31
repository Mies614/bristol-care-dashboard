/**
 * 统一 ID 工具 — UUID 安全策略。
 *
 * 数据库 courses.id / deadlines.id 是 uuid 类型，
 * 因此所有涉及 courses/deadlines 的 id 操作必须保证产出合法 UUID。
 *
 * ensureStringId 仅用于其他 text 类型的 id 列（如 quick_links, love_notes 等），
 * courses/deadlines 必须使用 ensureUuid。
 */

/**
 * 检查一个值是否是标准 UUID v1/v4 格式。
 */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * 生成一个合法 UUID v4。
 * 优先使用 crypto.randomUUID()，不可用时使用 fallback。
 */
export function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: UUID v4 格式
  // https://stackoverflow.com/a/2117523
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 确保返回合法 UUID。
 * - 如果 value 已是合法 UUID，直接返回
 * - 否则生成新的合法 UUID
 *
 * 用于 courses/deadlines 等 uuid 列。
 */
export function ensureUuid(value: unknown): string {
  if (isUuid(value)) return value;
  return createUuid();
}

/**
 * 确保 value 是一个非空 string id。
 * 仅用于 text 类型的 id 列（quick_links, love_notes 等），
 * 不用于 courses/deadlines（它们必须使用 ensureUuid）。
 */
export function ensureStringId(value: unknown, prefix: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return createStableId(prefix);
}

/**
 * 生成带前缀的稳定 id（仅用于 text 列）。
 */
export function createStableId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}