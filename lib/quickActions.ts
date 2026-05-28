/**
 * QuickActions — 快捷动作
 *
 * 升级自旧的 quickLinks 概念。
 * 旧数据自动迁移：旧 quickLinks 只有 title/url → 转换为 type="external", href=url
 *
 * 数据类型：
 *   - internal: 跳转到站内页面 (href)
 *   - external: 新窗口打开外部链接 (href)
 *   - action:   触发内部操作 (action)
 *
 * 存储位置：settings 表的 "quick_actions" key，JSON 序列化。
 * 兼容旧 key: "quickLinks", "quick_links" (读取时 fallback)
 */

// ── 操作类型 ──

export type QuickActionType = "internal" | "external" | "action";

/** 支持的内部操作 */
export type QuickActionAction =
  | "compose_note"
  | "upload_memory"
  | "add_deadline"
  | "add_course"
  | "record_period"
  | "miss_you";

/** 内置图标标识 */
export type QuickActionIcon =
  | "pencil"
  | "camera"
  | "calendar"
  | "clock"
  | "heart"
  | "file"
  | "cart"
  | "map"
  | "mail"
  | "credit-card"
  | "siren"
  | "sparkles"
  | "star"
  | "link";

// ── 数据结构 ──

export type QuickAction = {
  id: string;
  label: string;
  type: QuickActionType;
  /** internal / external 时使用 */
  href?: string;
  /** action 时使用 */
  action?: QuickActionAction;
  /** 可选图标标识 */
  icon?: QuickActionIcon;
  /** 可选主题色，如 "rose" "sage" "butter" "lilac" "skySoft" */
  color?: string;
  /** 是否在首页展示 */
  enabled: boolean;
  /** 排序权重，升序 */
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

/** 旧 quickLinks 兼容类型 */
type LegacyQuickLink = {
  id?: string;
  title?: string;
  label?: string;
  url?: string;
  href?: string;
  category?: string;
  sortOrder?: number;
  sort_order?: number;
};

// ── 默认快捷动作 ──

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "qa-compose-note",
    label: "写小纸条",
    type: "internal",
    href: "/notes?compose=1",
    icon: "pencil",
    color: "rose",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "qa-upload-memory",
    label: "上传回忆",
    type: "internal",
    href: "/albums?upload=1",
    icon: "camera",
    color: "skySoft",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "qa-add-deadline",
    label: "添加 DDL",
    type: "internal",
    href: "/deadlines?action=add",
    icon: "calendar",
    color: "butter",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "qa-record-period",
    label: "记录经期",
    type: "internal",
    href: "/period?action=add",
    icon: "heart",
    color: "lilac",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "qa-cards",
    label: "会员卡夹",
    type: "internal",
    href: "/cards",
    icon: "credit-card",
    color: "sage",
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "qa-miss-you",
    label: "想你一下",
    type: "action",
    action: "miss_you",
    icon: "sparkles",
    color: "rose",
    enabled: true,
    sortOrder: 5,
  },
];

/** 首页最多展示的快捷动作数 */
export const MAX_VISIBLE_ACTIONS = 6;

// ── 归一化 ──

const VALID_TYPES: QuickActionType[] = ["internal", "external", "action"];
const VALID_ACTIONS: QuickActionAction[] = [
  "compose_note",
  "upload_memory",
  "add_deadline",
  "add_course",
  "record_period",
  "miss_you",
];

const VALID_ICONS: QuickActionIcon[] = [
  "pencil",
  "camera",
  "calendar",
  "clock",
  "heart",
  "file",
  "cart",
  "map",
  "mail",
  "credit-card",
  "siren",
  "sparkles",
  "star",
  "link",
];

const VALID_COLORS = [
  "rose",
  "sage",
  "butter",
  "lilac",
  "skySoft",
  "cocoa",
  "blush",
  "cream",
  "mint",
];

function generateId(): string {
  return `qa-${crypto.randomUUID?.()?.slice(0, 8) || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  return undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function asQuickActionType(value: unknown): QuickActionType {
  if (typeof value === "string" && VALID_TYPES.includes(value as QuickActionType)) {
    return value as QuickActionType;
  }
  return "external";
}

function asQuickActionAction(value: unknown): QuickActionAction | undefined {
  if (typeof value === "string" && VALID_ACTIONS.includes(value as QuickActionAction)) {
    return value as QuickActionAction;
  }
  return undefined;
}

function asQuickActionIcon(value: unknown): QuickActionIcon | undefined {
  if (typeof value === "string" && VALID_ICONS.includes(value as QuickActionIcon)) {
    return value as QuickActionIcon;
  }
  return undefined;
}

function asColor(value: unknown): string | undefined {
  if (typeof value === "string" && VALID_COLORS.includes(value)) return value;
  return undefined;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** 将单个旧 quickLink 迁移为 QuickAction */
export function migrateLegacyQuickLink(link: LegacyQuickLink): QuickAction | null {
  const title = asString(link.title) || asString(link.label);
  const url = asString(link.url) || asString(link.href);
  if (!title || !url) return null;

  const isInternal = url.startsWith("/");

  return {
    id: asString(link.id) || generateId(),
    label: title,
    type: isInternal ? "internal" : "external",
    href: url,
    enabled: true,
    sortOrder: asNumber(link.sortOrder ?? link.sort_order),
  };
}

/** 标准化单个 QuickAction */
export function normalizeQuickAction(value: unknown): QuickAction | null {
  if (!isRecord(value)) return null;
  const label = asString(value.label);
  if (!label) return null;

  const type = asQuickActionType(value.type);
  const action = asQuickActionAction(value.action);

  // external 必须有 href
  if (type === "external" && !asString(value.href)) return null;

  return {
    id: asString(value.id) || generateId(),
    label,
    type,
    href: asString(value.href),
    action,
    icon: asQuickActionIcon(value.icon),
    color: asColor(value.color),
    enabled: asBoolean(value.enabled, true),
    sortOrder: asNumber(value.sortOrder),
    createdAt: asString(value.createdAt) || nowISO(),
    updatedAt: asString(value.updatedAt) || nowISO(),
  };
}

/** 标准化快捷动作列表，兼容旧数据 */
export function normalizeQuickActions(
  raw: unknown,
  legacyLinks?: unknown
): QuickAction[] {
  // 尝试从新格式解析
  if (Array.isArray(raw)) {
    const normalized = raw.map(normalizeQuickAction).filter(Boolean) as QuickAction[];
    if (normalized.length > 0) return normalized;
  }

  // 尝试从对象值中解析 (settings 读取时可能是 {"quick_actions": [...]})
  if (isRecord(raw)) {
    const actions = Array.isArray((raw as Record<string, unknown>).quick_actions)
      ? (raw as Record<string, unknown>).quick_actions as unknown[]
      : [];
    const normalized = actions.map(normalizeQuickAction).filter(Boolean) as QuickAction[];
    if (normalized.length > 0) return normalized;
  }

  // 尝试从旧 quickLinks 迁移
  if (Array.isArray(legacyLinks) && legacyLinks.length > 0) {
    const migrated = legacyLinks
      .map(migrateLegacyQuickLink)
      .filter(Boolean) as QuickAction[];
    if (migrated.length > 0) return migrated;
  }

  // 兜底：返回默认
  return [...DEFAULT_QUICK_ACTIONS];
}

/** 获取在首页可见（已启用 + 排序后）的快捷动作 */
export function getVisibleQuickActions(actions: QuickAction[]): QuickAction[] {
  return actions
    .filter((a) => a.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, MAX_VISIBLE_ACTIONS);
}

/** 根据 type/action 获取跳转 href（仅用于 action 类型） */
export function getActionHref(actionValue?: QuickActionAction): string | undefined {
  switch (actionValue) {
    case "compose_note":
      return "/notes?compose=1";
    case "upload_memory":
      return "/albums?upload=1";
    case "add_deadline":
      return "/deadlines?action=add";
    case "add_course":
      return "/schedule?action=add";
    case "record_period":
      return "/period?action=add";
    case "miss_you":
      return undefined; // 按钮触发
    default:
      return undefined;
  }
}

/** 获取动作的显示副标题 */
export function getActionSubtitle(actionValue?: QuickActionAction): string {
  switch (actionValue) {
    case "compose_note":
      return "给小乖写一句话";
    case "upload_memory":
      return "放一张照片或视频";
    case "add_deadline":
      return "记一个截止日期";
    case "add_course":
      return "记一节课";
    case "record_period":
      return "记录身体状态";
    case "miss_you":
      return "点一下，收起来";
    default:
      return "";
  }
}

// ── 图标映射 ──

/**
 * 返回动作对应的 lucide-react 图标名
 * 用于客户端动态导入
 */
export function getActionLucideIcon(icon?: QuickActionIcon): string {
  switch (icon) {
    case "pencil":
      return "Pencil";
    case "camera":
      return "Camera";
    case "calendar":
      return "Calendar";
    case "clock":
      return "Clock";
    case "heart":
      return "Heart";
    case "file":
      return "FileText";
    case "cart":
      return "ShoppingCart";
    case "map":
      return "Map";
    case "mail":
      return "Mail";
    case "credit-card":
      return "CreditCard";
    case "siren":
      return "Bell";
    case "sparkles":
      return "Sparkles";
    case "star":
      return "Star";
    case "link":
    default:
      return "Link";
  }
}

// ── 从 settings 读取快捷动作 ──

export type QuickActionsSettings = {
  quick_actions: QuickAction[];
};

/**
 * 从 settings 中提取 quick_actions 值
 * @param settingsRows settings 表中的行 [{key, value}, ...]
 * @param legacyQuickLinks 旧 quickLinks 数据（用来迁移）
 */
export function extractQuickActionsFromSettings(
  settingsRows: Array<{ key: string; value: unknown }>,
  legacyQuickLinks?: unknown
): QuickAction[] {
  // 查找 "quick_actions" key
  const quickActionsRow = settingsRows.find(
    (row) => row.key === "quick_actions"
  );

  // 如果有新数据，使用新数据
  if (quickActionsRow) {
    const parsed = normalizeQuickActions(quickActionsRow.value, legacyQuickLinks);
    if (parsed.length > 0) return parsed;
  }

  // 查找 "quickLinks" / "quick_links" 旧 key
  const legacyRow = settingsRows.find(
    (row) => row.key === "quickLinks" || row.key === "quick_links"
  );
  if (legacyRow && Array.isArray(legacyRow.value)) {
    const migrated = legacyRow.value
      .map(migrateLegacyQuickLink)
      .filter(Boolean) as QuickAction[];
    if (migrated.length > 0) return migrated;
  }

  // 兜底：默认
  return [...DEFAULT_QUICK_ACTIONS];
}

/**
 * 将 quick_actions 序列化为 settings 行
 * 确保 value 不为 null
 */
export function quickActionsToSettingsRow(
  actions: QuickAction[],
  spaceId: string
): {
  space_id: string;
  key: string;
  value: string;
  updated_at: string;
} {
  return {
    space_id: spaceId,
    key: "quick_actions",
    value: JSON.stringify(actions),
    updated_at: new Date().toISOString(),
  };
}