"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CardCropEditor } from "@/components/card-wallet/CardCropEditor";
import { CardEditorModal } from "@/components/card-wallet/CardEditorModal";
import { CardScanModal } from "@/components/card-wallet/CardScanModal";
import { CardWalletGrid } from "@/components/card-wallet/CardWalletGrid";
import { getDefaultCardCrop, type CardCrop, type WalletCard, type WalletCardInput } from "@/lib/cardWallet";
import {
  createWalletCard,
  deleteCardImage,
  deleteWalletCard,
  getCardCrop,
  getCardImage,
  listCardStates,
  listWalletCards,
  reorderWalletCards,
  restoreDefaultWalletCards,
  saveCardCrop,
  saveCardImage,
  updateWalletCard,
  type CardState
} from "@/lib/cardWalletDb";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";

type ActiveCard = {
  card: WalletCard;
  imageUrl?: string;
  crop: CardCrop;
};

export default function CardsPage() {
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [states, setStates] = useState<CardState[]>([]);
  const [active, setActive] = useState<ActiveCard | null>(null);
  const [cropEditing, setCropEditing] = useState<ActiveCard | null>(null);
  const [infoEditing, setInfoEditing] = useState<WalletCard | null>(null);
  const [creating, setCreating] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [message, setMessage] = useState("");
  const objectUrlsRef = useRef<string[]>([]);

  const rememberUrl = useCallback((url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    refresh();
    return () => {
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, []);

  async function refresh() {
    const nextCards = await listWalletCards();
    setCards(nextCards);
    setStates(await listCardStates(nextCards));
  }

  async function buildActiveCard(cardId: string): Promise<ActiveCard | null> {
    const card = cards.find((item) => item.id === cardId) || await listWalletCards().then((items) => items.find((item) => item.id === cardId));
    if (!card) return null;
    const image = await getCardImage(card.id);
    const crop = await getCardCrop(card.id);
    return {
      card,
      imageUrl: image ? rememberUrl(URL.createObjectURL(image.blob)) : undefined,
      crop: crop || getDefaultCardCrop(card)
    };
  }

  async function openCard(cardId: string) {
    setMessage("");
    const next = await buildActiveCard(cardId);
    if (!next) return;
    setActive(next);
  }

  async function editCrop(cardId: string) {
    setMessage("");
    const next = await buildActiveCard(cardId);
    if (!next?.imageUrl) {
      setMessage("请先添加卡码图片。");
      return;
    }
    setCropEditing(next);
  }

  async function uploadImage(cardId: string, file: File) {
    setMessage("");
    try {
      await saveCardImage(cardId, file, { mimeType: file.type });
      await refresh();
      setMessage("已保存卡码图片。");
    } catch {
      setMessage("图片保存失败，请重试。");
    }
  }

  async function persistCrop(cardId: string, crop: CardCrop) {
    await saveCardCrop(cardId, crop);
    await refresh();
    setCropEditing((current) => current?.card.id === cardId ? { ...current, crop } : current);
    setMessage("裁剪已保存。");
  }

  async function saveCardInfo(input: WalletCardInput, image?: File | null) {
    if (infoEditing) {
      await updateWalletCard(infoEditing.id, input);
      if (image) await saveCardImage(infoEditing.id, image, { mimeType: image.type });
      setInfoEditing(null);
      setMessage("会员卡已更新。");
    } else {
      const card = await createWalletCard(input);
      if (card && image) await saveCardImage(card.id, image, { mimeType: image.type });
      setCreating(false);
      setMessage("会员卡已添加。");
    }
    await refresh();
  }

  async function removeCard(cardId: string) {
    if (!confirm("确定删除这张卡吗？本机保存的图片也会一起删除。")) return;
    await deleteWalletCard(cardId);
    await refresh();
    setMessage("会员卡已删除。");
  }

  async function moveCard(cardId: string, direction: -1 | 1) {
    const index = cards.findIndex((card) => card.id === cardId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= cards.length) return;
    const ids = cards.map((card) => card.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setCards(await reorderWalletCards(ids));
    await refresh();
  }

  async function restoreDefaults() {
    await restoreDefaultWalletCards();
    await refresh();
    setMessage("默认卡已恢复。");
  }

  const savedCount = states.filter((state) => state.hasImage).length;
  const stateMap = useMemo(() => new Map(states.map((state) => [state.cardId, state])), [states]);

  return (
    <AppShell>
      <PageHeader title="卡夹" subtitle="常用卡放在这里，结账时点开就能扫。" action={<StatusPill variant="partner">小乖端</StatusPill>} />
      <p className="-mt-2 mb-4 rounded-[var(--app-radius)] bg-white/62 px-3 py-2 text-sm text-[var(--app-muted)]">已保存 {savedCount}/{cards.length || 0} · 图片只保存在当前设备，离线也可以打开已保存的卡。</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <AppButton variant="primary" onClick={() => setCreating(true)} aria-label="新增会员卡">新增会员卡</AppButton>
        <AppButton variant="secondary" onClick={() => setSorting((current) => !current)} aria-label={sorting ? "完成排序" : "编辑排序"}>{sorting ? "完成排序" : "编辑排序"}</AppButton>
        <AppButton variant="secondary" onClick={restoreDefaults} aria-label="恢复默认卡">恢复默认卡</AppButton>
      </div>

      {message ? (
        <div className="mb-4 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">
          {message}
        </div>
      ) : null}

      {cards.length ? (
        <CardWalletGrid
          cards={cards}
          isSorting={sorting}
          states={states}
          onCrop={editCrop}
          onDelete={removeCard}
          onEdit={setInfoEditing}
          onImage={uploadImage}
          onMoveDown={(id) => moveCard(id, 1)}
          onMoveUp={(id) => moveCard(id, -1)}
          onOpen={openCard}
        />
      ) : (
        <AppCard>
          <p className="py-8 text-center text-sm text-[var(--app-muted)]">还没有会员卡，可以先添加一张。</p>
          <AppButton variant="primary" className="mt-3 w-full" onClick={() => setCreating(true)} aria-label="新增会员卡">新增会员卡</AppButton>
        </AppCard>
      )}

      {active ? (
        <CardScanModal
          card={active.card}
          crop={active.crop}
          imageUrl={active.imageUrl}
          onClose={() => setActive(null)}
        />
      ) : null}

      {cropEditing?.imageUrl ? (
        <CardCropEditor
          card={cropEditing.card}
          crop={cropEditing.crop}
          imageUrl={cropEditing.imageUrl}
          onClose={() => setCropEditing(null)}
          onSave={async (crop) => {
            await persistCrop(cropEditing.card.id, crop);
            setCropEditing(null);
          }}
        />
      ) : null}

      {(creating || infoEditing) ? (
        <CardEditorModal
          card={infoEditing}
          onClose={() => { setCreating(false); setInfoEditing(null); }}
          onDeleteImage={infoEditing ? async () => { await deleteCardImage(infoEditing.id); await refresh(); setMessage("图片已删除。"); } : undefined}
          onSave={saveCardInfo}
        />
      ) : null}

      <div className="sr-only">
        {cards.map((card) => <span key={card.id}>{stateMap.get(card.id)?.hasImage ? "saved" : "empty"}</span>)}
      </div>
    </AppShell>
  );
}