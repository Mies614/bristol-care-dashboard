"use client";

import { useEffect, useState } from "react";
import { CardImageView } from "./CardImageView";
import { getDefaultCardCrop, normalizeCardCrop, type CardCrop, type WalletCard } from "@/lib/cardWallet";

export function CardCropEditor({
  card,
  imageUrl,
  crop,
  onClose,
  onSave
}: {
  card: WalletCard;
  imageUrl: string;
  crop: CardCrop;
  onClose: () => void;
  onSave: (crop: CardCrop) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CardCrop>(normalizeCardCrop(crop, card));

  useEffect(() => setDraft(normalizeCardCrop(crop, card)), [crop, card]);

  function setPosition(position: "top" | "center" | "bottom") {
    setDraft((current) => ({
      ...current,
      positionX: 50,
      positionY: position === "top" ? 28 : position === "bottom" ? 72 : 50
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-cocoa/55 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-md rounded-[1.75rem] bg-cream p-4 shadow-float">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker mb-1">Crop</p>
            <h2 className="font-semibold text-cocoa">{card.name}</h2>
          </div>
          <button className="btn-secondary btn-small" onClick={onClose}>关闭</button>
        </div>
        <CardImageView alt={`${card.name} 裁剪预览`} crop={draft} imageUrl={imageUrl} />
        <div className="mt-4 space-y-3">
          <p className="notice">调整图片位置，让扫码区域更清楚。</p>
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-secondary btn-small" onClick={() => setPosition("top")}>靠上</button>
            <button className="btn-secondary btn-small" onClick={() => setPosition("center")}>居中</button>
            <button className="btn-secondary btn-small" onClick={() => setPosition("bottom")}>靠下</button>
          </div>
          <label className="block text-sm text-cocoa/70">
            横向位置 {draft.positionX}%
            <input className="mt-2 w-full accent-[#8c6a60]" type="range" min={0} max={100} value={draft.positionX} onChange={(event) => setDraft({ ...draft, positionX: Number(event.target.value) })} />
          </label>
          <label className="block text-sm text-cocoa/70">
            纵向位置 {draft.positionY}%
            <input className="mt-2 w-full accent-[#8c6a60]" type="range" min={0} max={100} value={draft.positionY} onChange={(event) => setDraft({ ...draft, positionY: Number(event.target.value) })} />
          </label>
          <label className="block text-sm text-cocoa/70">
            放大 {draft.zoom.toFixed(2)}x
            <input className="mt-2 w-full accent-[#8c6a60]" type="range" min={0.7} max={3} step={0.05} value={draft.zoom} onChange={(event) => setDraft({ ...draft, zoom: Number(event.target.value) })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select className="field" value={draft.aspectRatio} onChange={(event) => setDraft({ ...draft, aspectRatio: event.target.value as CardCrop["aspectRatio"] })}>
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="4:3">4:3</option>
              <option value="16:9">16:9</option>
              <option value="auto">自适应</option>
            </select>
            <button className="btn-secondary" onClick={() => setDraft({ ...draft, rotate: ((draft.rotate + 90) % 360) as CardCrop["rotate"] })}>旋转</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={() => setDraft(getDefaultCardCrop(card))}>使用默认裁剪</button>
            <button className="btn-primary" onClick={() => onSave(draft)}>保存裁剪</button>
          </div>
        </div>
      </div>
    </div>
  );
}
