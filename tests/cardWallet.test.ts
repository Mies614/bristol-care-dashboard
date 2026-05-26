import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { prepareAutoSyncData } from "@/lib/autoSync";
import { createBackupPayload } from "@/lib/backup";
import {
  CARD_WALLET_ITEMS,
  getCardLabel,
  getDefaultCardCrop,
  makeWalletCard,
  reorderWalletCardsPure,
  shouldExcludeCardsFromBackup
} from "@/lib/cardWallet";
import { deleteWalletCard, openCardWalletDb } from "@/lib/cardWalletDb";
import { defaultAppData } from "@/lib/sampleData";

describe("card wallet", () => {
  it("includes the four default cards", () => {
    expect(CARD_WALLET_ITEMS).toHaveLength(4);
    expect(CARD_WALLET_ITEMS.map((item) => item.key)).toEqual(["tesco", "lidl", "nectar", "sparks"]);
  });

  it("each card has key, name and code type", () => {
    for (const item of CARD_WALLET_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.key).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(["qr", "barcode", "mixed", "other"]).toContain(item.codeType);
    }
  });

  it("can create a new custom card", () => {
    const card = makeWalletCard(
      { name: "Boots Advantage", codeType: "mixed", brandColor: "#234EA2", sortOrder: 4 },
      new Date("2026-05-26T00:00:00.000Z")
    );
    expect(card.name).toBe("Boots Advantage");
    expect(card.codeType).toBe("mixed");
    expect(card.sortOrder).toBe(4);
    expect(card.id).toBeTruthy();
  });

  it("default cards are editable data objects", () => {
    const edited = { ...CARD_WALLET_ITEMS[0], name: "Tesco Main Card", brandColor: "#123456" };
    expect(edited.name).toBe("Tesco Main Card");
    expect(edited.brandColor).toBe("#123456");
    expect(edited.isDefault).toBe(true);
  });

  it("can reorder cards with pure ordering logic", () => {
    const [first, second, ...rest] = CARD_WALLET_ITEMS;
    const reordered = reorderWalletCardsPure(CARD_WALLET_ITEMS, [second.id, first.id, ...rest.map((card) => card.id)]);
    expect(reordered[0].id).toBe(second.id);
    expect(reordered[1].id).toBe(first.id);
    expect(reordered.map((card) => card.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it("returns crop presets by card type", () => {
    expect(getDefaultCardCrop({ codeType: "qr" })).toMatchObject({ aspectRatio: "1:1" });
    expect(getDefaultCardCrop({ codeType: "barcode" })).toMatchObject({ aspectRatio: "16:9" });
    expect(getDefaultCardCrop({ codeType: "mixed" })).toMatchObject({ aspectRatio: "4:3" });
    expect(getDefaultCardCrop({ codeType: "other" })).toMatchObject({ aspectRatio: "auto" });
  });

  it("returns readable labels", () => {
    expect(getCardLabel("tesco")).toBe("Tesco Clubcard");
    expect(getCardLabel("unknown")).toBe("会员卡");
  });

  it("does not crash when IndexedDB is unavailable", async () => {
    await expect(openCardWalletDb()).resolves.toBeNull();
    await expect(deleteWalletCard("tesco")).resolves.toBeUndefined();
  });

  it("card images are not part of backup payload", () => {
    const payload = createBackupPayload() as Record<string, unknown>;
    expect(shouldExcludeCardsFromBackup(payload)).toBe(true);
  });

  it("card images are not part of auto sync payload", () => {
    const payload = prepareAutoSyncData(defaultAppData) as unknown as Record<string, unknown>;
    expect(shouldExcludeCardsFromBackup(payload)).toBe(true);
  });

  it("scan modal only exposes scan controls", () => {
    const source = readFileSync(new URL("../components/card-wallet/CardScanModal.tsx", import.meta.url), "utf8");
    expect(source).toContain("CARD_SCAN_MODAL_ALLOWED_ACTIONS");
    expect(source).toContain("放大");
    expect(source).toContain("缩小");
    expect(source).toContain("旋转显示");
    expect(source).not.toContain("更换图片");
    expect(source).not.toContain("删除");
    expect(source).not.toContain("编辑");
    expect(source).not.toContain("重新裁剪");
  });

  it("main wallet card keeps management actions outside scan modal", () => {
    const source = readFileSync(new URL("../components/card-wallet/CardWalletCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("打开扫码");
    expect(source).toContain("管理这张卡");
    expect(source).toContain("编辑");
    expect(source).toContain("裁剪");
    expect(source).toContain("删除");
  });
});
