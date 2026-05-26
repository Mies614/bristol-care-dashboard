"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CardCodeType, WalletCard, WalletCardInput } from "@/lib/cardWallet";

const presetColors = ["#00539F", "#0050AA", "#7B2CF6", "#111111", "#D91E36", "#0B8F6A"];

export function CardEditorModal({
  card,
  onClose,
  onSave,
  onDeleteImage
}: {
  card?: WalletCard | null;
  onClose: () => void;
  onSave: (input: WalletCardInput, image?: File | null) => Promise<void>;
  onDeleteImage?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<WalletCardInput>({
    name: "",
    shortName: "",
    codeType: "qr",
    brandColor: "#7B2CF6",
    accentColor: "#F1E9FF"
  });
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    setDraft({
      name: card?.name || "",
      shortName: card?.shortName || "",
      codeType: card?.codeType || "qr",
      brandColor: card?.brandColor || "#7B2CF6",
      accentColor: card?.accentColor || "#F1E9FF",
      sortOrder: card?.sortOrder
    });
    setImage(null);
  }, [card]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name?.trim()) return;
    setSaving(true);
    await onSave(draft, image);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-cocoa/55 p-4 backdrop-blur-sm">
      <form className="mx-auto max-w-md rounded-[1.75rem] bg-cream p-4 shadow-float" onSubmit={submit}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker mb-1">{card ? "Edit" : "New Card"}</p>
            <h2 className="font-semibold text-cocoa">{card ? "编辑会员卡" : "新增会员卡"}</h2>
          </div>
          <button className="btn-secondary btn-small" onClick={onClose} type="button">关闭</button>
        </div>
        <div className="space-y-3">
          <input className="field" placeholder="卡片名称" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="field" placeholder="短名称，可选" value={draft.shortName || ""} onChange={(event) => setDraft({ ...draft, shortName: event.target.value })} />
          <select className="field" value={draft.codeType || "qr"} onChange={(event) => setDraft({ ...draft, codeType: event.target.value as CardCodeType })}>
            <option value="qr">QR</option>
            <option value="barcode">条形码</option>
            <option value="mixed">混合</option>
            <option value="other">其他</option>
          </select>
          <label className="block text-sm text-cocoa/70">
            品牌色
            <div className="mt-2 flex gap-2">
              <input className="h-12 w-16 rounded-2xl border border-white/80 bg-white/80 p-1" type="color" value={draft.brandColor || "#7B2CF6"} onChange={(event) => setDraft({ ...draft, brandColor: event.target.value })} />
              <input className="field" value={draft.brandColor || ""} onChange={(event) => setDraft({ ...draft, brandColor: event.target.value })} />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((color) => (
              <button className="h-8 w-8 rounded-full border border-white/80 shadow-sm" key={color} style={{ backgroundColor: color }} type="button" onClick={() => setDraft({ ...draft, brandColor: color })}>
                <span className="sr-only">{color}</span>
              </button>
            ))}
          </div>
          <label className="block text-sm text-cocoa/70">
            辅助色
            <input className="field mt-1" value={draft.accentColor || ""} onChange={(event) => setDraft({ ...draft, accentColor: event.target.value })} />
          </label>
          <label className="file-panel">
            <span className="font-medium text-cocoa">卡码图片，可选</span>
            <span className="mt-1 block text-xs text-cocoa/52">{image ? image.name : "JPG / PNG / WebP"}</span>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImage(event.currentTarget.files?.[0] || null)}
            />
          </label>
          {onDeleteImage ? <button className="btn-secondary btn-small" onClick={onDeleteImage} type="button">删除图片</button> : null}
          <button className="btn-primary w-full" disabled={saving} type="submit">{saving ? "保存中..." : "保存"}</button>
        </div>
      </form>
    </div>
  );
}
