"use client";

import type { CardWalletItem } from "@/lib/cardWallet";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export function CardImageUploader({
  card,
  onImage
}: {
  card: CardWalletItem;
  onImage: (file: File) => Promise<void>;
}) {
  return (
    <label className="btn-secondary btn-small cursor-pointer">
      更换图片
      <input
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          try {
            if (!allowedTypes.includes(file.type)) throw new Error("请上传 JPG、PNG 或 WebP 图片。");
            if (file.size > 12 * 1024 * 1024) throw new Error("图片太大，请换一张更小的截图。");
            await onImage(file);
          } finally {
            input.value = "";
          }
        }}
      />
      <span className="sr-only">上传 {card.name}</span>
    </label>
  );
}
