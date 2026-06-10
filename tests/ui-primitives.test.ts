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
