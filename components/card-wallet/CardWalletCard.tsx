"use client";

import { CardImageUploader } from "./CardImageUploader";
import type { CardState } from "@/lib/cardWalletDb";
import type { WalletCard } from "@/lib/cardWallet";

export function CardWalletCard({
  card,
  state,
  isFirst,
  isLast,
  isSorting,
  onOpen,
  onCrop,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onImage
}: {
  card: WalletCard;
  state?: CardState;
  isFirst?: boolean;
  isLast?: boolean;
  isSorting?: boolean;
  onOpen: () => void;
  onCrop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImage: (file: File) => Promise<void>;
}) {
  const saved = Boolean(state?.hasImage);
  const codeLabel = card.codeType === "qr" ? "QR" : card.codeType === "barcode" ? "条形码" : card.codeType === "mixed" ? "混合" : "其他";
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/78 shadow-soft ring-1 ring-white/60 backdrop-blur-xl">
      <div className="h-2" style={{ backgroundColor: card.brandColor }} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa/45">{codeLabel}</p>
            <h2 className="mt-1 font-semibold text-cocoa">{card.name}</h2>
            {card.shortName ? <p className="mt-1 text-xs text-cocoa/50">{card.shortName}</p> : null}
          </div>
          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: card.accentColor, color: card.brandColor }}>
            {saved ? "已保存" : "未保存"}
          </span>
        </div>
        <div className="rounded-[1.35rem] border border-white/70 p-4 text-sm text-cocoa/62" style={{ backgroundColor: card.accentColor }}>
          {saved ? "已保存图片，离线也可以打开。" : "还没有保存图片"}
        </div>
        <button className="btn-primary w-full" onClick={onOpen} type="button">打开扫码</button>
        <details className="rounded-[1.2rem] border border-white/70 bg-white/55 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-cocoa/70">管理这张卡</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <CardImageUploader card={card} onImage={onImage} />
            <button className="btn-secondary btn-small" onClick={onEdit} type="button">编辑</button>
            <button className="btn-secondary btn-small" disabled={!saved} onClick={onCrop} type="button">裁剪</button>
            {isSorting ? (
              <>
                <button className="btn-secondary btn-small" disabled={isFirst} onClick={onMoveUp} type="button">上移</button>
                <button className="btn-secondary btn-small" disabled={isLast} onClick={onMoveDown} type="button">下移</button>
              </>
            ) : null}
            <button className="btn-danger btn-small" onClick={onDelete} type="button">删除</button>
          </div>
        </details>
      </div>
    </article>
  );
}
