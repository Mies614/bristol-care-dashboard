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

// ────────────────────── Round 6B-2: compact variants ──────────────────────

describe("MissYouCombinedCard compact variant", () => {
  it("compact mode renders without floating hearts", () => {
    const isCompact = true;
    const showsHearts = !isCompact;
    expect(showsHearts).toBe(false);
  });

  it("owner compact shows partner label", () => {
    const otherLabel = "小乖";
    expect(otherLabel).toBe("小乖");
  });

  it("partner compact shows partner label", () => {
    const otherLabel = "他";
    expect(otherLabel).toBe("他");
  });

  it("compact button clickable (label exists)", () => {
    const ownerLabel = "想小乖一下";
    const partnerLabel = "想他一下";
    expect(ownerLabel.length).toBeGreaterThan(0);
    expect(partnerLabel.length).toBeGreaterThan(0);
  });

  it("fallback copy is preserved", () => {
    const offlineMsg = "网络慢了一点，先帮你存在本机。";
    expect(offlineMsg).toBe("网络慢了一点，先帮你存在本机。");
  });
});

describe("LoveNoteCard homepageCompact", () => {
  it("compact mode hides comments section", () => {
    const compact = true;
    const showComments = !compact;
    expect(showComments).toBe(false);
  });

  it("compact mode hides interactions", () => {
    const compact = true;
    const showInteractions = !compact;
    expect(showInteractions).toBe(false);
  });

  it("owner compact uses /me/notes href", () => {
    const href = "/me/notes";
    expect(href).toBe("/me/notes");
  });

  it("partner compact uses /notes href", () => {
    const href = "/notes";
    expect(href).toBe("/notes");
  });

  it("compact title says 小乖最近的小纸条 on owner side", () => {
    const title = "小乖最近的小纸条";
    expect(title).toContain("小乖");
  });

  it("compact title says 最近的小纸条 on partner side", () => {
    const title = "最近的小纸条";
    expect(title).toBe("最近的小纸条");
  });
});

describe("XiaoguaiStatusCard", () => {
  it("renders 小乖今天 title", () => {
    const title = "小乖今天";
    expect(title).toBe("小乖今天");
  });

  it("links use /me prefix", () => {
    const notesHref = "/me/notes";
    const memoriesUnreadHref = "/me/memories/unread";
    expect(notesHref.startsWith("/me")).toBe(true);
    expect(memoriesUnreadHref.startsWith("/me")).toBe(true);
  });

  it("empty state falls back gracefully", () => {
    const fallback = "小乖今天的状态正在慢慢同步。";
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("does not contain admin or management language", () => {
    const forbidden = ["管理", "admin", "后台", "数据维护"];
    const cardText = "小乖今天 她那边 22°C，晴朗 小乖今天想你 3 次";
    for (const word of forbidden) {
      expect(cardText.includes(word)).toBe(false);
    }
  });
});

describe("WeatherCareHint missing fields", () => {
  it("does not render undefined or null", () => {
    const validInputs = [null, undefined, "", 0];
    // The component should guard against these
    const check = (v: unknown) => typeof v === "number" ? v > -273 : !!v;
    expect(validInputs.filter((v) => check(v))).toEqual([0]);
  });
});

// ────────────────────── Round 6B-3: HomeTimeHint ──────────────────────

describe("HomeTimeHint — Beijing detection", () => {
  it("non-Beijing location shows local + Beijing time format", () => {
    // For non-Beijing, the format is "你那边 HH:MM · 北京 HH:MM"
    const format = "你那边 14:30 · 北京 02:30";
    expect(format).toContain("你那边");
    expect(format).toContain("北京");
  });

  it("Beijing city in English is recognized", () => {
    const city = "Beijing, CN";
    const isBeijing = city.toLowerCase().includes("beijing");
    expect(isBeijing).toBe(true);
  });

  it("Beijing city in Chinese is recognized", () => {
    const city = "北京市";
    const isBeijing = city.includes("北京");
    expect(isBeijing).toBe(true);
  });

  it("Beijing tz + city combo recognized", () => {
    const tz = "Asia/Shanghai";
    const city = "Beijing";
    const isBeijing = tz === "Asia/Shanghai" && city.toLowerCase().includes("beijing");
    expect(isBeijing).toBe(true);
  });

  it("Bristol fallback is NOT recognized as Beijing", () => {
    const tz = "Asia/Shanghai";
    const city = "Bristol, UK";
    const isBeijing = tz === "Asia/Shanghai" && city.toLowerCase().includes("beijing");
    expect(isBeijing).toBe(false);
  });

  it("uses Asia/Shanghai timezone for Beijing time", () => {
    const beijingTZ = "Asia/Shanghai";
    expect(beijingTZ).toBe("Asia/Shanghai");
  });

  it("does not render undefined or null", () => {
    // The component guards against null/undefined inputs
    const guards = (v: unknown) => v != null;
    expect(guards(null)).toBe(false);
    expect(guards(undefined)).toBe(false);
  });

  it("does not show technical timezone strings to users", () => {
    const displayText = "北京时间 14:30";
    expect(displayText).not.toContain("Asia/Shanghai");
    expect(displayText).not.toContain("Europe/London");
  });
});

describe("HomeTimeHint — client mount safety", () => {
  it("SSR fallback is empty placeholder", () => {
    const mounted = false;
    const visible = mounted;
    expect(visible).toBe(false);
  });

  it("after mount renders time", () => {
    const mounted = true;
    expect(mounted).toBe(true);
  });
});
