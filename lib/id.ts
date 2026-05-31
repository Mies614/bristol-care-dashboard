/**
 * 统一 ID 工具。
 * 保证所有 ID 相关操作都有兜底，绝不出 null / undefined / 空字符串。
 */

export function createStableId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 确保 value 是一个非空 string id。
 * - 如果 value 是非空 string，直接返回 trim 后的值
 * - 如果 value 是 null / undefined / 空字符串，用 createStableId 生成新 id
 */
export function ensureStringId(value: unknown, prefix: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return createStableId(prefix);
}

/**
 * 检查一个值是否是标准 UUID 格式。
 */
export function isUuid(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}