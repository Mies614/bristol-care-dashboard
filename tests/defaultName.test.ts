import { describe, expect, it } from "vitest";
import { defaultAppData } from "@/lib/sampleData";
import { validateAppData } from "@/lib/validation";

describe("default name", () => {
  it("uses 小乖 as the default nickname", () => {
    expect(defaultAppData.nickname).toBe("小乖");
  });

  it("does not expose the old default name in fallback data", () => {
    expect(JSON.stringify(defaultAppData)).not.toContain("\u5b9d\u5b9d");
    const data = validateAppData({ nickname: "", nextMeetDate: "", note: "", courses: [], deadlines: [], links: [], loveNotes: [] });
    expect(data.nickname).toBe("");
  });
});
