"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CardCropEditor } from "@/components/card-wallet/CardCropEditor";
import { CardScanModal } from "@/components/card-wallet/CardScanModal";
import { CardWalletGrid } from "@/components/card-wallet/CardWalletGrid";
import { CARD_WALLET_ITEMS, getCardConfig, getDefaultCardCrop, type CardCrop, type CardWalletKey } from "@/lib/cardWallet";
import { getCardCrop, getCardImage, listCardStates, saveCardCrop, saveCardImage, type CardState } from "@/lib/cardWalletDb";

type ActiveCard = {
  key: CardWalletKey;
  imageUrl: string;
  crop: CardCrop;
};

export default function CardsPage() {
  const [states, setStates] = useState<CardState[]>([]);
  const [active, setActive] = useState<ActiveCard | null>(null);
  const [editing, setEditing] = useState<ActiveCard | null>(null);
  const [message, setMessage] = useState("");
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  const stateMap = useMemo(() => new Map(states.map((state) => [state.cardKey, state])), [states]);

  const rememberUrl = useCallback((url: string) => {
    setObjectUrls((current) => [...current, url]);
    return url;
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
    // objectUrls cleanup only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const next = await listCardStates();
    setStates(next);
  }

  async function buildActiveCard(key: CardWalletKey): Promise<ActiveCard | null> {
    const image = await getCardImage(key);
    if (!image) return null;
    const crop = await getCardCrop(key);
    const imageUrl = rememberUrl(URL.createObjectURL(image.blob));
    return { key, imageUrl, crop: crop || getDefaultCardCrop(key) };
  }

  async function openCard(key: CardWalletKey) {
    setMessage("");
    const next = await buildActiveCard(key);
    if (!next) {
      setMessage("请先添加卡码图片。");
      return;
    }
    setActive(next);
  }

  async function editCrop(key: CardWalletKey) {
    setMessage("");
    const next = await buildActiveCard(key);
    if (!next) {
      setMessage("请先添加卡码图片。");
      return;
    }
    setEditing(next);
  }

  async function uploadImage(key: CardWalletKey, file: File) {
    setMessage("");
    try {
      await saveCardImage(key, file, { mimeType: file.type });
      await refresh();
      setMessage("已保存卡码图片。");
    } catch {
      setMessage("图片保存失败，请重试。");
    }
  }

  async function persistCrop(key: CardWalletKey, crop: CardCrop) {
    await saveCardCrop(key, crop);
    await refresh();
    setActive((current) => current?.key === key ? { ...current, crop } : current);
    setEditing((current) => current?.key === key ? { ...current, crop } : current);
    setMessage("裁剪已保存。");
  }

  const savedCount = states.filter((state) => state.hasImage).length;

  return (
    <AppShell>
      <section className="mb-4 rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/90 via-skySoft/55 to-lilac/45 p-5 shadow-float backdrop-blur-xl">
        <p className="section-kicker mb-1">Wallet</p>
        <h1 className="text-2xl font-semibold text-cocoa">会员卡夹</h1>
        <p className="mt-2 text-sm leading-6 text-cocoa/65">常用卡放在这里，结账时点开就能扫。</p>
        <p className="mt-3 rounded-2xl bg-white/62 px-3 py-2 text-sm text-cocoa/65">已保存 {savedCount}/4 · 图片只保存在当前设备，离线也可以打开已保存的卡。</p>
      </section>

      {message ? <p className="notice mb-4">{message}</p> : null}

      <CardWalletGrid
        states={states}
        onCrop={editCrop}
        onImage={uploadImage}
        onOpen={openCard}
      />

      <section className="soft-card mt-4 space-y-2 text-sm leading-6 text-cocoa/68">
        <p className="section-kicker mb-1">Crop Tips</p>
        <p>Tesco Clubcard：保留二维码主体和下方会员号。</p>
        <p>Lidl Plus：保留白色卡片区域，包括 Lidl 标志、QR 和会员号。</p>
        <p>Nectar：保留紫色会员卡区域，包括二维码和卡号。</p>
        <p>M&S Sparks：保留 Sparks logo、会员号和条形码。</p>
      </section>

      {active ? (() => {
        const card = getCardConfig(active.key);
        if (!card) return null;
        return (
          <CardScanModal
            card={card}
            crop={active.crop}
            imageUrl={active.imageUrl}
            onClose={() => setActive(null)}
            onCrop={() => { setEditing(active); setActive(null); }}
            onSaveCrop={(crop) => persistCrop(active.key, crop)}
          />
        );
      })() : null}

      {editing ? (() => {
        const card = getCardConfig(editing.key);
        if (!card) return null;
        return (
          <CardCropEditor
            card={card}
            crop={editing.crop}
            imageUrl={editing.imageUrl}
            onClose={() => setEditing(null)}
            onSave={async (crop) => {
              await persistCrop(editing.key, crop);
              setEditing(null);
            }}
          />
        );
      })() : null}

      <div className="sr-only">
        {CARD_WALLET_ITEMS.map((card) => <span key={card.key}>{stateMap.get(card.key)?.hasImage ? "saved" : "empty"}</span>)}
      </div>
    </AppShell>
  );
}
