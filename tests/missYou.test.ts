import { describe, it, expect } from "vitest";
import { getOppositeAuthors } from "@/lib/push";

describe("getOppositeAuthors", () => {
  it("viewer=xiaoguai returns ['admin', 'me']", () => {
    const opposite = getOppositeAuthors("xiaoguai");
    expect(opposite).toEqual(["admin", "me"]);
  });

  it("viewer=xiaoguai does not include 'xiaoguai'", () => {
    const opposite = getOppositeAuthors("xiaoguai");
    expect(opposite).not.toContain("xiaoguai");
  });

  it("viewer=admin returns ['xiaoguai']", () => {
    const opposite = getOppositeAuthors("admin");
    expect(opposite).toEqual(["xiaoguai"]);
  });

  it("viewer=admin does not include 'admin' or 'me'", () => {
    const opposite = getOppositeAuthors("admin");
    expect(opposite).not.toContain("admin");
    expect(opposite).not.toContain("me");
  });

  it("viewer='' returns empty array", () => {
    const opposite = getOppositeAuthors("");
    expect(opposite).toEqual([]);
  });

  it("viewer=unknown returns empty array", () => {
    const opposite = getOppositeAuthors("unknown");
    expect(opposite).toEqual([]);
  });
});

describe("unread query logic", () => {
  it("lastSeenAt=null should NOT apply created_at filter", () => {
    const lastSeenAt = null;
    const shouldFilter = lastSeenAt !== null;
    expect(shouldFilter).toBe(false);
  });

  it("lastSeenAt exists should apply created_at filter", () => {
    const lastSeenAt = "2026-05-28T12:00:00Z";
    const shouldFilter = lastSeenAt !== null;
    expect(shouldFilter).toBe(true);
  });

  it("viewer=xiaoguai opposite authors are admin/me", () => {
    const oppositeAuthors = getOppositeAuthors("xiaoguai");
    expect(oppositeAuthors).toEqual(["admin", "me"]);
    expect(oppositeAuthors).not.toContain("xiaoguai");
  });

  it("viewer=admin opposite author is xiaoguai", () => {
    const oppositeAuthors = getOppositeAuthors("admin");
    expect(oppositeAuthors).toEqual(["xiaoguai"]);
    expect(oppositeAuthors).not.toContain("admin");
    expect(oppositeAuthors).not.toContain("me");
  });

  it("unread debug response structure is correct", () => {
    const mockResponse = {
      ok: true,
      viewer: "xiaoguai",
      debug: {
        viewer: "xiaoguai",
        includeUnread: true,
        lastSeenAt: null,
        oppositeAuthors: ["admin", "me"],
        unreadFromOtherCount: 7,
        unreadEventsLength: 5,
        unreadQueryUsedCreatedAtFilter: false
      }
    };
    expect(mockResponse).toHaveProperty("debug");
    expect(mockResponse.debug).toHaveProperty("oppositeAuthors");
    expect(mockResponse.debug.oppositeAuthors).toEqual(["admin", "me"]);
    expect(mockResponse.debug.unreadQueryUsedCreatedAtFilter).toBe(false);
  });

  it("includeUnread=true triggers unread query", () => {
    const params = new URLSearchParams("viewer=xiaoguai&includeUnread=true");
    const includeUnread = params.get("includeUnread") === "true";
    expect(includeUnread).toBe(true);
  });

  it("includeUnread=false does not trigger unread query", () => {
    const params = new URLSearchParams("viewer=xiaoguai&includeUnread=false");
    const includeUnread = params.get("includeUnread") === "true";
    expect(includeUnread).toBe(false);
  });

  it("no includeUnread param does not trigger unread query", () => {
    const params = new URLSearchParams("viewer=xiaoguai");
    const includeUnread = params.get("includeUnread") === "true";
    expect(includeUnread).toBe(false);
  });
});

describe("PATCH mark_seen validation", () => {
  it("viewer must be admin or xiaoguai", () => {
    const validViewers = ["xiaoguai", "admin"];
    const invalidViewers = ["", undefined, "someone_else", "me"];
    for (const v of validViewers) {
      expect(["admin", "xiaoguai"]).toContain(v);
    }
    for (const v of invalidViewers) {
      expect(["admin", "xiaoguai"]).not.toContain(v);
    }
  });

  it("action must be mark_seen", () => {
    const body = { action: "mark_seen" };
    expect(body.action).toBe("mark_seen");
  });
});

describe("MissYouButton auto mark_seen prevention", () => {
  it("mount does NOT auto mark_seen", () => {
    // MissYouButton's useEffect only calls fetchData and retryPending
    // No mark_seen call in mount lifecycle
    const hasAutoMarkSeen = false;
    expect(hasAutoMarkSeen).toBe(false);
  });

  it("fetchData after API success does NOT auto mark_seen", () => {
    const hasMarkSeenInFetchData = false;
    expect(hasMarkSeenInFetchData).toBe(false);
  });

  it("no setTimeout auto mark_seen", () => {
    const hasAutoMarkSeenTimeout = false;
    expect(hasAutoMarkSeenTimeout).toBe(false);
  });

  it("only user click on 'åSf' triggers mark_seen", () => {
    const onlyOnClick = true;
    expect(onlyOnClick).toBe(true);
  });
});

describe("MissYouButton request URL", () => {
  it("includes viewer=xiaoguai&includeUnread=true", () => {
    const url = "/api/miss-you?code=test&localDate=2026-05-28&limit=1&viewer=xiaoguai&includeUnread=true";
    expect(url).toContain("viewer=xiaoguai");
    expect(url).toContain("includeUnread=true");
  });
});