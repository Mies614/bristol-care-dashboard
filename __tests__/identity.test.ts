/**
 * Unit tests for lib/identity.ts — formal identity system v1.3
 */

import { describe, it, expect } from "vitest";
import {
  getDefaultIdentities,
  normalizeIdentityId,
  migrateLegacyIdentityId,
  getIdentityLabel,
  isAdminIdentity,
  isSameIdentity,
  getIdentityById,
  getIdentityAvatarEmoji,
  getUserFacingAuthorLabel,
  getIdentityDisplayName,
  resolveCurrentIdentity,
  DEFAULT_NORMAL_IDENTITY_ID,
  ADMIN_IDENTITY_ID,
  LEGACY_DEFAULT_IDENTITY,
  IDENTITY_PARTNER,
  IDENTITY_SELF,
  IDENTITY_ADMIN,
  type UserIdentity,
} from "@/lib/identity";

// ─── Test helpers ───

function makeCustomIdentity(
  overrides: Partial<UserIdentity> = {}
): UserIdentity {
  return {
    id: "custom-1",
    displayName: "自定义",
    role: "partner",
    avatarEmoji: "🐱",
    isDefault: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════
// Task 11.1: 默认身份列表包含普通身份、me、admin
// ══════════════════════════════════════════════════════════════════════

describe("getDefaultIdentities", () => {
  it("should return exactly three identities", () => {
    const ids = getDefaultIdentities("space-a");
    expect(ids).toHaveLength(3);
  });

  it("should include xiaoguai (partner)", () => {
    const ids = getDefaultIdentities("space-a");
    const partner = ids.find((i) => i.id === "xiaoguai");
    expect(partner).toBeDefined();
    expect(partner!.role).toBe("partner");
    expect(partner!.displayName).toBe("小乖");
    expect(partner!.isDefault).toBe(true);
  });

  it("should include me (self)", () => {
    const ids = getDefaultIdentities("space-a");
    const self = ids.find((i) => i.id === "me");
    expect(self).toBeDefined();
    expect(self!.role).toBe("self");
    expect(self!.displayName).toBe("我");
  });

  it("should include admin", () => {
    const ids = getDefaultIdentities("space-a");
    const admin = ids.find((i) => i.id === "admin");
    expect(admin).toBeDefined();
    expect(admin!.role).toBe("admin");
    expect(admin!.displayName).toBe("Admin");
  });

  it("should have all three roles", () => {
    const ids = getDefaultIdentities("space-b");
    const roles = ids.map((i) => i.role).sort();
    expect(roles).toEqual(["admin", "partner", "self"]);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Task 11.2: normalizeIdentityId 处理空值、default、admin
// ══════════════════════════════════════════════════════════════════════

describe("normalizeIdentityId", () => {
  it("should map null to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(normalizeIdentityId(null)).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map undefined to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(normalizeIdentityId(undefined)).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map empty string to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(normalizeIdentityId("")).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map whitespace-only string to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(normalizeIdentityId("   ")).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should keep 'xiaoguai' unchanged", () => {
    expect(normalizeIdentityId("xiaoguai")).toBe("xiaoguai");
  });

  it("should keep 'me' unchanged", () => {
    expect(normalizeIdentityId("me")).toBe("me");
  });

  it("should keep 'admin' unchanged", () => {
    expect(normalizeIdentityId("admin")).toBe("admin");
  });

  it("should keep arbitrary id unchanged", () => {
    expect(normalizeIdentityId("custom-person")).toBe("custom-person");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Task 11.3: legacy "default" 映射到默认普通身份
// ══════════════════════════════════════════════════════════════════════

describe("migrateLegacyIdentityId", () => {
  it("should map 'default' to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(migrateLegacyIdentityId("default")).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map null to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(migrateLegacyIdentityId(null)).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map undefined to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(migrateLegacyIdentityId(undefined)).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should map empty string to DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(migrateLegacyIdentityId("")).toBe(DEFAULT_NORMAL_IDENTITY_ID);
  });

  it("should keep non-legacy ids unchanged", () => {
    expect(migrateLegacyIdentityId("admin")).toBe("admin");
    expect(migrateLegacyIdentityId("me")).toBe("me");
    expect(migrateLegacyIdentityId("xiaoguai")).toBe("xiaoguai");
  });

  it("should trim whitespace before migrating", () => {
    expect(migrateLegacyIdentityId("  default  ")).toBe(DEFAULT_NORMAL_IDENTITY_ID);
    expect(migrateLegacyIdentityId("  admin  ")).toBe("admin");
  });
});

// ══════════════════════════════════════════════════════════════════════
// getIdentityLabel
// ══════════════════════════════════════════════════════════════════════

describe("getIdentityLabel", () => {
  it("should return 小乖 for xiaoguai", () => {
    expect(getIdentityLabel("xiaoguai")).toBe("小乖");
  });

  it("should return 我 for me", () => {
    expect(getIdentityLabel("me")).toBe("我");
  });

  it("should return Admin for admin", () => {
    expect(getIdentityLabel("admin")).toBe("Admin");
  });

  it("should return displayName from custom identities list", () => {
    const identities = [
      makeCustomIdentity({ id: "friend", displayName: "好朋友" }),
    ];
    expect(getIdentityLabel("friend", identities)).toBe("好朋友");
  });

  it("should fallback to built-in for unknown id without identities", () => {
    const label = getIdentityLabel("unknown-id");
    expect(typeof label).toBe("string");
    expect(label).toBeTruthy();
    expect(label).not.toBe("undefined");
    expect(label).not.toBe("null");
  });

  it("should map 'default' to 小乖", () => {
    expect(getIdentityLabel("default")).toBe("小乖");
  });

  it("should map null to 小乖", () => {
    expect(getIdentityLabel(null)).toBe("小乖");
  });

  it("should map undefined to 小乖", () => {
    expect(getIdentityLabel(undefined)).toBe("小乖");
  });

  it("should prefer custom identity over built-in constant", () => {
    const identities = [
      makeCustomIdentity({ id: "xiaoguai", displayName: "自定义小乖" }),
    ];
    expect(getIdentityLabel("xiaoguai", identities)).toBe("自定义小乖");
  });

  it("should not return undefined/null labels (Task 11.18)", () => {
    // Test all edge cases
    expect(getIdentityLabel(null)).toBeTruthy();
    expect(getIdentityLabel(undefined)).toBeTruthy();
    expect(getIdentityLabel("")).toBeTruthy();
    expect(getIdentityLabel("nonexistent-xyz-123")).toBeTruthy();
    expect(getIdentityLabel("nonexistent-xyz-123", [])).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════
// isAdminIdentity
// ══════════════════════════════════════════════════════════════════════

describe("isAdminIdentity", () => {
  it("should return true for 'admin'", () => {
    expect(isAdminIdentity("admin")).toBe(true);
  });

  it("should return true for 'me'", () => {
    expect(isAdminIdentity("me")).toBe(true);
  });

  it("should return false for 'xiaoguai'", () => {
    expect(isAdminIdentity("xiaoguai")).toBe(false);
  });

  it("should return false for null", () => {
    expect(isAdminIdentity(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isAdminIdentity(undefined)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// isSameIdentity
// ══════════════════════════════════════════════════════════════════════

describe("isSameIdentity", () => {
  it("should return true for same id", () => {
    expect(isSameIdentity("xiaoguai", "xiaoguai")).toBe(true);
  });

  it("should return false for different ids", () => {
    expect(isSameIdentity("xiaoguai", "admin")).toBe(false);
  });

  it("should treat 'default' as same as DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(isSameIdentity("default", DEFAULT_NORMAL_IDENTITY_ID)).toBe(true);
  });

  it("should treat null as same as DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(isSameIdentity(null, DEFAULT_NORMAL_IDENTITY_ID)).toBe(true);
  });

  it("should treat undefined as same as DEFAULT_NORMAL_IDENTITY_ID", () => {
    expect(isSameIdentity(undefined, DEFAULT_NORMAL_IDENTITY_ID)).toBe(true);
  });

  it("should treat both null as same", () => {
    expect(isSameIdentity(null, null)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// getIdentityById
// ══════════════════════════════════════════════════════════════════════

describe("getIdentityById", () => {
  const identities = getDefaultIdentities("test");

  it("should find xiaoguai by id", () => {
    const found = getIdentityById(identities, "xiaoguai");
    expect(found).toBeDefined();
    expect(found!.id).toBe("xiaoguai");
    expect(found!.displayName).toBe("小乖");
  });

  it("should find me by id", () => {
    const found = getIdentityById(identities, "me");
    expect(found).toBeDefined();
    expect(found!.id).toBe("me");
  });

  it("should find admin by id", () => {
    const found = getIdentityById(identities, "admin");
    expect(found).toBeDefined();
    expect(found!.id).toBe("admin");
  });

  it("should return undefined for unknown id", () => {
    expect(getIdentityById(identities, "unknown")).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// getIdentityAvatarEmoji
// ══════════════════════════════════════════════════════════════════════

describe("getIdentityAvatarEmoji", () => {
  it("should return 🐰 for xiaoguai", () => {
    expect(getIdentityAvatarEmoji("xiaoguai")).toBe("🐰");
  });

  it("should return 🌙 for me", () => {
    expect(getIdentityAvatarEmoji("me")).toBe("🌙");
  });

  it("should return 🛠️ for admin", () => {
    expect(getIdentityAvatarEmoji("admin")).toBe("🛠️");
  });

  it("should return custom emoji from identities list", () => {
    const identities = [
      makeCustomIdentity({ id: "cat", avatarEmoji: "🐱" }),
    ];
    expect(getIdentityAvatarEmoji("cat", identities)).toBe("🐱");
  });

  it("should return undefined for unknown id", () => {
    expect(getIdentityAvatarEmoji("unknown")).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// getUserFacingAuthorLabel / getIdentityDisplayName
// ══════════════════════════════════════════════════════════════════════

describe("getUserFacingAuthorLabel", () => {
  it("should return same as getIdentityLabel", () => {
    expect(getUserFacingAuthorLabel("xiaoguai")).toBe("小乖");
    expect(getUserFacingAuthorLabel("admin")).toBe("Admin");
    expect(getUserFacingAuthorLabel(null)).toBe("小乖");
  });
});

describe("getIdentityDisplayName", () => {
  it("should return display name", () => {
    expect(getIdentityDisplayName("xiaoguai")).toBe("小乖");
    expect(getIdentityDisplayName("me")).toBe("我");
    expect(getIdentityDisplayName("admin")).toBe("Admin");
  });
});

// ══════════════════════════════════════════════════════════════════════
// resolveCurrentIdentity
// ══════════════════════════════════════════════════════════════════════

describe("resolveCurrentIdentity", () => {
  const defaults = getDefaultIdentities("test");

  it("should resolve xiaoguai from hint", () => {
    const resolved = resolveCurrentIdentity(defaults, "xiaoguai");
    expect(resolved.id).toBe("xiaoguai");
  });

  it("should resolve me from hint", () => {
    const resolved = resolveCurrentIdentity(defaults, "me");
    expect(resolved.id).toBe("me");
  });

  it("should fallback to default when hint is unknown", () => {
    const resolved = resolveCurrentIdentity(defaults, "unknown");
    expect(resolved).toBeDefined();
    expect(resolved.id).toBe("xiaoguai"); // Default partner
  });

  it("should fallback to default when hint is null", () => {
    const resolved = resolveCurrentIdentity(defaults, null);
    expect(resolved.id).toBe("xiaoguai");
  });

  it("should not return undefined (Task 11.18)", () => {
    const resolved = resolveCurrentIdentity([], "any");
    expect(resolved).toBeDefined();
    expect(resolved.id).toBe("xiaoguai");
    expect(resolved.displayName).toBe("小乖");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Constants integrity
// ══════════════════════════════════════════════════════════════════════

describe("identity constants", () => {
  it("DEFAULT_NORMAL_IDENTITY_ID should be xiaoguai", () => {
    expect(DEFAULT_NORMAL_IDENTITY_ID).toBe("xiaoguai");
  });

  it("ADMIN_IDENTITY_ID should be admin", () => {
    expect(ADMIN_IDENTITY_ID).toBe("admin");
  });

  it("LEGACY_DEFAULT_IDENTITY should be 'default'", () => {
    expect(LEGACY_DEFAULT_IDENTITY).toBe("default");
  });

  it("IDENTITY_PARTNER should be xiaoguai", () => {
    expect(IDENTITY_PARTNER.id).toBe("xiaoguai");
    expect(IDENTITY_PARTNER.role).toBe("partner");
    expect(IDENTITY_PARTNER.isDefault).toBe(true);
  });

  it("IDENTITY_SELF should be me", () => {
    expect(IDENTITY_SELF.id).toBe("me");
    expect(IDENTITY_SELF.role).toBe("self");
  });

  it("IDENTITY_ADMIN should be admin", () => {
    expect(IDENTITY_ADMIN.id).toBe("admin");
    expect(IDENTITY_ADMIN.role).toBe("admin");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Task 11.4: 不同 spaceCode 身份隔离
// ══════════════════════════════════════════════════════════════════════

describe("spaceCode isolation", () => {
  it("getDefaultIdentities should produce independent arrays per spaceCode", () => {
    const idsA = getDefaultIdentities("space-a");
    const idsB = getDefaultIdentities("space-b");

    // Different references
    expect(idsA).not.toBe(idsB);
    // Same structure
    expect(idsA.map((i) => i.id).sort()).toEqual(
      idsB.map((i) => i.id).sort()
    );
    // Each has same number
    expect(idsA).toHaveLength(idsB.length);
  });
});

// ══════════════════════════════════════════════════════════════════════
// Task 11.16: 旧 "default" reminder preference 仍可被 Cron 处理
// ══════════════════════════════════════════════════════════════════════

describe("legacy compatibility for cron/reminders", () => {
  it("should normalize 'default' identity to xiaoguai for reminder preferences", () => {
    expect(normalizeIdentityId("default")).toBe("xiaoguai");
  });

  it("should normalize empty identity to xiaoguai", () => {
    expect(normalizeIdentityId("")).toBe("xiaoguai");
  });

  it("should keep explicit xiaoguai identity unchanged", () => {
    expect(normalizeIdentityId("xiaoguai")).toBe("xiaoguai");
  });

  it("should keep me identity unchanged", () => {
    expect(normalizeIdentityId("me")).toBe("me");
  });
});

// ══════════════════════════════════════════════════════════════════════
// Task 11.18: 无身份数据时 UI 不出现 undefined/null
// ══════════════════════════════════════════════════════════════════════

describe("UI safety — no undefined/null in labels", () => {
  const edgeCases = [
    { input: null, label: "null" },
    { input: undefined as unknown as string, label: "undefined" },
    { input: "", label: "empty" },
    { input: "   ", label: "whitespace" },
    { input: "random-nonexistent-id-999", label: "unknown" },
  ];

  for (const { input, label } of edgeCases) {
    it(`getIdentityLabel for ${label} should not be undefined/null/empty`, () => {
      const result = getIdentityLabel(input ?? undefined);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  }

  it("getIdentityLabel with empty identities list should not throw", () => {
    expect(() => getIdentityLabel("some-id", [])).not.toThrow();
  });

  it("getIdentityAvatarEmoji with unknown id should return undefined (acceptable)", () => {
    expect(getIdentityAvatarEmoji("unknown-id", [])).toBeUndefined();
  });

  it("resolveCurrentIdentity with empty list should return fallback", () => {
    const result = resolveCurrentIdentity([], null);
    expect(result).toBeDefined();
    expect(result.displayName).toBe("小乖");
    expect(result.id).toBe("xiaoguai");
  });
});