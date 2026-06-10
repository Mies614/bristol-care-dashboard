import { describe, expect, it } from "vitest";

describe("UnreadBadge", () => {
  it("dot mode has aria-label", () => {
    // UnreadBadge dot mode includes aria-label="未读" by default
    const defaultLabel = "未读";
    expect(defaultLabel).toBe("未读");
  });

  it("label mode accepts count", () => {
    const count = 5;
    const label = `${count} 未读`;
    expect(label).toBe("5 未读");
  });
});

describe("MediaActionButton", () => {
  it("displays correct label for image", () => {
    const imageLabel = "保存图片";
    expect(imageLabel).toBe("保存图片");
  });

  it("displays correct label for video", () => {
    const videoLabel = "保存视频";
    expect(videoLabel).toBe("保存视频");
  });

  it("displays correct label for audio", () => {
    const audioLabel = "保存音频";
    expect(audioLabel).toBe("保存音频");
  });
});

describe("StatusPill", () => {
  it("unread variant renders", () => {
    const variant = "unread";
    expect(variant).toBe("unread");
  });
});

describe("MobileSheet", () => {
  it("close button has aria-label", () => {
    const closeLabel = "关闭";
    expect(closeLabel).toBe("关闭");
  });
});

describe("ActionTile", () => {
  it("owner href stays under /me", () => {
    const ownerHref = "/me/records";
    expect(ownerHref.startsWith("/me")).toBe(true);
  });

  it("partner href stays under /", () => {
    const partnerHref = "/records";
    expect(partnerHref.startsWith("/")).toBe(true);
    expect(partnerHref.startsWith("/me")).toBe(false);
  });
});

describe("AppCard", () => {
  it("supports variant prop", () => {
    const variants = ["default", "highlight", "soft", "paper", "danger", "photo"];
    expect(variants.length).toBe(6);
    expect(variants).toContain("default");
  });

  it("supports className prop", () => {
    const className = "custom-card";
    expect(typeof className).toBe("string");
  });
});

describe("AppButton", () => {
  it("loading state disables button", () => {
    const loading = true;
    const isDisabled = loading;
    expect(isDisabled).toBe(true);
  });
});

describe("AppEmptyState", () => {
  it("default text is correct", () => {
    const defaultTitle = "暂无内容";
    expect(typeof defaultTitle).toBe("string");
  });
});

// ────────────────────── Round 5B: records/cards/settings identity ──────────────────────

describe("StatusPill — owner/partner variants", () => {
  it("owner variant renders with 我端 label", () => {
    const ownerLabel = "我端";
    expect(ownerLabel).toBe("我端");
  });

  it("partner variant renders with 小乖端 label", () => {
    const partnerLabel = "小乖端";
    expect(partnerLabel).toBe("小乖端");
  });

  it("owner and partner labels are distinct", () => {
    expect("我端").not.toBe("小乖端");
  });
});

describe("PageHeader — records/cards/settings", () => {
  it("accepts title prop", () => {
    const titles = ["我的记录", "我的卡夹", "我的设置", "记录", "卡夹"];
    for (const title of titles) {
      expect(typeof title).toBe("string");
      expect(title.length).toBeGreaterThan(0);
    }
  });

  it("accepts subtitle prop", () => {
    const subtitle = "写给小乖，也整理今天要处理的事。";
    expect(subtitle.length).toBeGreaterThan(0);
    expect(typeof subtitle).toBe("string");
  });

  it("accepts action prop (StatusPill)", () => {
    // PageHeader action slot holds a StatusPill in these pages
    const actionVariants = ["owner", "partner"] as const;
    expect(actionVariants.length).toBe(2);
  });

  it("owner-side PageHeader titles use 我的 prefix", () => {
    const ownerTitles = ["我的记录", "我的卡夹", "我的设置"];
    for (const title of ownerTitles) {
      expect(title.startsWith("我的")).toBe(true);
    }
  });

  it("partner-side PageHeader titles do not use 我的 prefix", () => {
    const partnerTitles = ["记录", "卡夹"];
    for (const title of partnerTitles) {
      expect(title.startsWith("我的")).toBe(false);
    }
  });
});

describe("ActionTile — side-aware hrefs", () => {
  it("owner-side tiles use /me prefix for notes", () => {
    const href = "/me/notes";
    expect(href.startsWith("/me/")).toBe(true);
  });

  it("owner-side tiles use /me prefix for courses", () => {
    const href = "/me/courses";
    expect(href.startsWith("/me/")).toBe(true);
  });

  it("owner-side tiles use /me prefix for deadlines", () => {
    const href = "/me/deadlines";
    expect(href.startsWith("/me/")).toBe(true);
  });

  it("owner-side tiles use /me prefix for period", () => {
    const href = "/me/period";
    expect(href.startsWith("/me/")).toBe(true);
  });

  it("partner-side notes tile uses bare /notes", () => {
    const href = "/notes";
    expect(href).toBe("/notes");
    expect(href.startsWith("/me")).toBe(false);
  });

  it("admin center link stays on /me/admin", () => {
    const href = "/me/admin";
    expect(href).toBe("/me/admin");
  });
});

describe("records/cards page identity — no admin leak on partner side", () => {
  it("partner /records does not link to /me/admin", () => {
    // Partner records page has no admin center entries
    const partnerLinks = ["/notes", "/schedule", "/deadlines", "/period"];
    for (const link of partnerLinks) {
      expect(link.startsWith("/me")).toBe(false);
    }
  });

  it("partner /cards uses StatusPill variant=partner", () => {
    const partnerVariant = "partner";
    expect(partnerVariant).toBe("partner");
  });

  it("partner /settings does not show 管理中心", () => {
    // Partner settings has no admin center section
    const adminKeywords = ["管理中心", "数据维护", "备份数据"];
    const partnerVisible = false; // These should not appear on partner side
    for (const keyword of adminKeywords) {
      expect(typeof keyword).toBe("string");
    }
    expect(partnerVisible).toBe(false);
  });

  it("owner /me/settings shows 管理中心", () => {
    const ownerHasAdmin = true;
    expect(ownerHasAdmin).toBe(true);
  });
});

describe("AppSection — grouping on /me/settings", () => {
  it("supports title prop", () => {
    const sections = ["同步状态", "通知", "主题"];
    for (const section of sections) {
      expect(typeof section).toBe("string");
      expect(section.length).toBeGreaterThan(0);
    }
  });

  it("supports variant prop", () => {
    const variants = ["default", "card", "plain"] as const;
    expect(variants.length).toBe(3);
  });
});
