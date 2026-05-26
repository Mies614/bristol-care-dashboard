import { describe, expect, it } from "vitest";
import { prepareAutoSyncData } from "@/lib/autoSync";
import { createBackupPayload } from "@/lib/backup";
import {
  CARD_WALLET_ITEMS,
  getCardLabel,
  getDefaultCardCrop,
  shouldExcludeCardsFromBackup
} from "@/lib/cardWallet";
import { openCardWalletDb } from "@/lib/cardWalletDb";
import { defaultAppData } from "@/lib/sampleData";

describe("card wallet", () => {
  it("includes the four default cards", () => {
    expect(CARD_WALLET_ITEMS).toHaveLength(4);
    expect(CARD_WALLET_ITEMS.map((item) => item.key)).toEqual(["tesco", "lidl", "nectar", "sparks"]);
  });

  it("each card has key, name and code type", () => {
    for (const item of CARD_WALLET_ITEMS) {
      expect(item.key).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(["qr", "barcode"]).toContain(item.codeType);
    }
  });

  it("returns reasonable crop presets", () => {
    expect(getDefaultCardCrop("tesco")).toMatchObject({ aspectRatio: "4:5" });
    expect(getDefaultCardCrop("lidl").positionY).toBeLessThan(50);
    expect(getDefaultCardCrop("nectar")).toMatchObject({ aspectRatio: "16:9" });
    expect(getDefaultCardCrop("sparks")).toMatchObject({ aspectRatio: "16:9" });
  });

  it("returns readable labels", () => {
    expect(getCardLabel("tesco")).toBe("Tesco Clubcard");
    expect(getCardLabel("unknown")).toBe("会员卡");
  });

  it("does not crash when IndexedDB is unavailable", async () => {
    await expect(openCardWalletDb()).resolves.toBeNull();
  });

  it("card images are not part of backup payload", () => {
    const payload = createBackupPayload() as Record<string, unknown>;
    expect(shouldExcludeCardsFromBackup(payload)).toBe(true);
  });

  it("card images are not part of auto sync payload", () => {
    const payload = prepareAutoSyncData(defaultAppData) as unknown as Record<string, unknown>;
    expect(shouldExcludeCardsFromBackup(payload)).toBe(true);
  });
});
