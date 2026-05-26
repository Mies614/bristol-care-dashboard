"use client";

import { CardImageUploader } from "./CardImageUploader";
import type { CardState } from "@/lib/cardWalletDb";
import type { CardWalletItem } from "@/lib/cardWallet";

export function CardWalletCard({
  card,
  state,
  onOpen,
  onCrop,
  onImage
}: {
  card: CardWalletItem;
  state?: CardState;
  onOpen: () => void;
  onCrop: () => void;
  onImage: (file: File) => Promise<void>;
}) {
  const saved = Boolean(state?.hasImage);
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/78 shadow-soft ring-1 ring-white/60 backdrop-blur-xl">
      <div className="h-2" style={{ backgroundColor: card.brandColor }} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa/45">{card.codeType === "qr" ? "QR" : "Barcode"}</p>
            <h2 className="mt-1 font-semibold text-cocoa">{card.name}</h2>
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: card.accentColor, color: card.brandColor }}>
            {saved ? "已保存" : "未保存"}
          </span>
        </div>
        <div className="rounded-[1.35rem] border border-white/70 p-4 text-sm text-cocoa/62" style={{ backgroundColor: card.accentColor }}>
          {saved ? "已保存图片，离线也可以打开。" : "还没有保存图片"}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-small" disabled={!saved} onClick={onOpen} type="button">打开</button>
          <CardImageUploader card={card} onImage={onImage} />
          <button className="btn-secondary btn-small" disabled={!saved} onClick={onCrop} type="button">裁剪</button>
        </div>
      </div>
    </article>
  );
}
