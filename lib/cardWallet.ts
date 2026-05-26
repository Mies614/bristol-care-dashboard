export type CardWalletKey = "tesco" | "lidl" | "nectar" | "sparks";

export type CardCodeType = "qr" | "barcode";

export type CardCrop = {
  positionX: number;
  positionY: number;
  zoom: number;
  rotate: 0 | 90 | 180 | 270;
  aspectRatio: "1:1" | "4:5" | "4:3" | "16:9";
};

export type CardWalletItem = {
  key: CardWalletKey;
  name: string;
  shortName: string;
  codeType: CardCodeType;
  brandColor: string;
  accentColor: string;
};

export const CARD_WALLET_ITEMS: CardWalletItem[] = [
  {
    key: "tesco",
    name: "Tesco Clubcard",
    shortName: "Tesco",
    codeType: "qr",
    brandColor: "#00539F",
    accentColor: "#E8F2FF"
  },
  {
    key: "lidl",
    name: "Lidl Plus",
    shortName: "Lidl",
    codeType: "qr",
    brandColor: "#0050AA",
    accentColor: "#EAF2FF"
  },
  {
    key: "nectar",
    name: "Nectar",
    shortName: "Nectar",
    codeType: "qr",
    brandColor: "#7B2CF6",
    accentColor: "#F1E9FF"
  },
  {
    key: "sparks",
    name: "M&S Sparks",
    shortName: "Sparks",
    codeType: "barcode",
    brandColor: "#111111",
    accentColor: "#F7F2E8"
  }
];

export function getCardConfig(cardKey: string) {
  return CARD_WALLET_ITEMS.find((item) => item.key === cardKey);
}

export function getCardLabel(cardKey: string) {
  return getCardConfig(cardKey)?.name || "会员卡";
}

export function getDefaultCardCrop(cardKey: string): CardCrop {
  if (cardKey === "tesco") {
    return { positionX: 50, positionY: 47, zoom: 1.45, rotate: 0, aspectRatio: "4:5" };
  }
  if (cardKey === "lidl") {
    return { positionX: 50, positionY: 38, zoom: 1.35, rotate: 0, aspectRatio: "4:3" };
  }
  if (cardKey === "nectar") {
    return { positionX: 50, positionY: 26, zoom: 1.25, rotate: 0, aspectRatio: "16:9" };
  }
  if (cardKey === "sparks") {
    return { positionX: 50, positionY: 33, zoom: 1.35, rotate: 0, aspectRatio: "16:9" };
  }
  return { positionX: 50, positionY: 50, zoom: 1.2, rotate: 0, aspectRatio: "4:3" };
}

export function getAspectRatioValue(aspectRatio: CardCrop["aspectRatio"]) {
  if (aspectRatio === "1:1") return "1 / 1";
  if (aspectRatio === "4:5") return "4 / 5";
  if (aspectRatio === "16:9") return "16 / 9";
  return "4 / 3";
}

export function getCropTransform(crop: CardCrop) {
  return `translate(-${crop.positionX}%, -${crop.positionY}%) scale(${crop.zoom}) rotate(${crop.rotate}deg)`;
}

export function normalizeCardCrop(value: unknown, cardKey = ""): CardCrop {
  const fallback = getDefaultCardCrop(cardKey);
  if (typeof value !== "object" || value === null) return fallback;
  const record = value as Record<string, unknown>;
  const rotate = [0, 90, 180, 270].includes(Number(record.rotate)) ? Number(record.rotate) as CardCrop["rotate"] : fallback.rotate;
  const aspectRatio = ["1:1", "4:5", "4:3", "16:9"].includes(String(record.aspectRatio))
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

export function shouldExcludeCardsFromBackup(payload: Record<string, unknown>) {
  return !("cardImages" in payload) && !("cardWallet" in payload) && !("cards" in payload);
}
