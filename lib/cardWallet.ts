export type CardCodeType = "qr" | "barcode" | "mixed" | "other";

export type CardCrop = {
  positionX: number;
  positionY: number;
  zoom: number;
  rotate: 0 | 90 | 180 | 270;
  aspectRatio: "1:1" | "4:5" | "4:3" | "16:9" | "auto";
};

export type WalletCard = {
  id: string;
  key: string;
  name: string;
  shortName?: string;
  codeType: CardCodeType;
  brandColor: string;
  accentColor?: string;
  sortOrder: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WalletCardInput = {
  name: string;
  shortName?: string;
  codeType?: CardCodeType;
  brandColor?: string;
  accentColor?: string;
  sortOrder?: number;
};

const DEFAULT_CREATED_AT = "2026-01-01T00:00:00.000Z";

export const CARD_WALLET_ITEMS: WalletCard[] = [
  {
    id: "tesco",
    key: "tesco",
    name: "Tesco Clubcard",
    shortName: "Tesco",
    codeType: "qr",
    brandColor: "#00539F",
    accentColor: "#E8F2FF",
    sortOrder: 0,
    isDefault: true,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT
  },
  {
    id: "lidl",
    key: "lidl",
    name: "Lidl Plus",
    shortName: "Lidl",
    codeType: "qr",
    brandColor: "#0050AA",
    accentColor: "#EAF2FF",
    sortOrder: 1,
    isDefault: true,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT
  },
  {
    id: "nectar",
    key: "nectar",
    name: "Nectar",
    shortName: "Nectar",
    codeType: "qr",
    brandColor: "#7B2CF6",
    accentColor: "#F1E9FF",
    sortOrder: 2,
    isDefault: true,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT
  },
  {
    id: "sparks",
    key: "sparks",
    name: "M&S Sparks",
    shortName: "Sparks",
    codeType: "barcode",
    brandColor: "#111111",
    accentColor: "#F7F2E8",
    sortOrder: 3,
    isDefault: true,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT
  }
];

export function makeWalletCard(input: WalletCardInput, now = new Date()): WalletCard {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `card-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
  const timestamp = now.toISOString();
  return {
    id,
    key: id,
    name: input.name.trim(),
    shortName: input.shortName?.trim() || undefined,
    codeType: input.codeType || "qr",
    brandColor: input.brandColor || "#7B2CF6",
    accentColor: input.accentColor || "#F1E9FF",
    sortOrder: input.sortOrder ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function getCardLabel(card: Pick<WalletCard, "name"> | string) {
  if (typeof card === "string") return CARD_WALLET_ITEMS.find((item) => item.id === card || item.key === card)?.name || "会员卡";
  return card.name || "会员卡";
}

export function getDefaultCardCrop(cardOrType: string | Pick<WalletCard, "codeType">): CardCrop {
  const codeType = typeof cardOrType === "string"
    ? CARD_WALLET_ITEMS.find((item) => item.id === cardOrType || item.key === cardOrType)?.codeType || cardOrType
    : cardOrType.codeType;
  if (codeType === "qr") return { positionX: 50, positionY: 50, zoom: 1.25, rotate: 0, aspectRatio: "1:1" };
  if (codeType === "barcode") return { positionX: 50, positionY: 45, zoom: 1.35, rotate: 0, aspectRatio: "16:9" };
  if (codeType === "mixed") return { positionX: 50, positionY: 45, zoom: 1.2, rotate: 0, aspectRatio: "4:3" };
  return { positionX: 50, positionY: 50, zoom: 1.1, rotate: 0, aspectRatio: "auto" };
}

export function getAspectRatioValue(aspectRatio: CardCrop["aspectRatio"]) {
  if (aspectRatio === "1:1") return "1 / 1";
  if (aspectRatio === "4:5") return "4 / 5";
  if (aspectRatio === "16:9") return "16 / 9";
  if (aspectRatio === "auto") return "3 / 4";
  return "4 / 3";
}

export function getCropTransform(crop: CardCrop) {
  return `translate(-${crop.positionX}%, -${crop.positionY}%) scale(${crop.zoom}) rotate(${crop.rotate}deg)`;
}

export function normalizeCardCrop(value: unknown, cardOrType: string | Pick<WalletCard, "codeType"> = "mixed"): CardCrop {
  const fallback = getDefaultCardCrop(cardOrType);
  if (typeof value !== "object" || value === null) return fallback;
  const record = value as Record<string, unknown>;
  const rotate = [0, 90, 180, 270].includes(Number(record.rotate)) ? Number(record.rotate) as CardCrop["rotate"] : fallback.rotate;
  const aspectRatio = ["1:1", "4:5", "4:3", "16:9", "auto"].includes(String(record.aspectRatio))
    ? record.aspectRatio as CardCrop["aspectRatio"]
    : fallback.aspectRatio;
  return {
    positionX: Math.min(100, Math.max(0, Number(record.positionX) || fallback.positionX)),
    positionY: Math.min(100, Math.max(0, Number(record.positionY) || fallback.positionY)),
    zoom: Math.min(3, Math.max(0.7, Number(record.zoom) || fallback.zoom)),
    rotate,
    aspectRatio
  };
}

export function reorderWalletCardsPure(cards: WalletCard[], ids: string[]): WalletCard[] {
  const order = new Map(ids.map((id, index) => [id, index]));
  return cards
    .map((card) => ({ ...card, sortOrder: order.get(card.id) ?? card.sortOrder, updatedAt: new Date().toISOString() }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function shouldExcludeCardsFromBackup(payload: Record<string, unknown>) {
  return !("wallet_cards" in payload) && !("card_images" in payload) && !("card_settings" in payload) && !("cardWallet" in payload) && !("cards" in payload);
}
