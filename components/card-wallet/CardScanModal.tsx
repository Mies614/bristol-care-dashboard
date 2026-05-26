"use client";

import { useState } from "react";
import { CardImageView } from "./CardImageView";
import type { CardCrop, WalletCard } from "@/lib/cardWallet";

export const CARD_SCAN_MODAL_ALLOWED_ACTIONS = ["放大", "缩小", "旋转显示", "关闭"] as const;

export function CardScanModal({
  card,
  imageUrl,
  crop,
  onClose
}: {
  card: WalletCard;
  imageUrl?: string;
  crop: CardCrop;
  onClose: () => void;
}) {
  const [scanCrop, setScanCrop] = useState(crop);

  function update(next: CardCrop) {
    setScanCrop(next);
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white text-zinc-950 [overscroll-behavior:contain]">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))]">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{card.codeType === "barcode" ? "Barcode" : card.codeType === "mixed" ? "Mixed" : card.codeType === "other" ? "Card" : "QR"}</p>
          <h2 className="text-lg font-semibold">{card.name}</h2>
        </div>
        <button className="rounded-full border border-zinc-200 px-4 py-2 text-sm" onClick={onClose}>关闭</button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        {imageUrl ? (
          <CardImageView alt={`${card.name} 扫码图片`} crop={scanCrop} imageUrl={imageUrl} scan />
        ) : (
          <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
            还没有保存卡码图片。
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-zinc-200 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3">
        <button className="rounded-full bg-zinc-100 px-3 py-2 text-sm" onClick={() => update({ ...scanCrop, zoom: Math.min(3, scanCrop.zoom + 0.1) })}>放大</button>
        <button className="rounded-full bg-zinc-100 px-3 py-2 text-sm" onClick={() => update({ ...scanCrop, zoom: Math.max(0.7, scanCrop.zoom - 0.1) })}>缩小</button>
        <button className="rounded-full bg-zinc-100 px-3 py-2 text-sm" onClick={() => update({ ...scanCrop, rotate: ((scanCrop.rotate + 90) % 360) as CardCrop["rotate"] })}>旋转显示</button>
        <button className="rounded-full bg-zinc-900 px-3 py-2 text-sm text-white" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
