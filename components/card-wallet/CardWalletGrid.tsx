"use client";

import { CardWalletCard } from "./CardWalletCard";
import { CARD_WALLET_ITEMS, type CardWalletKey } from "@/lib/cardWallet";
import type { CardState } from "@/lib/cardWalletDb";

export function CardWalletGrid({
  states,
  onOpen,
  onCrop,
  onImage
}: {
  states: CardState[];
  onOpen: (key: CardWalletKey) => void;
  onCrop: (key: CardWalletKey) => void;
  onImage: (key: CardWalletKey, file: File) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARD_WALLET_ITEMS.map((card) => (
        <CardWalletCard
          card={card}
          key={card.key}
          state={states.find((state) => state.cardKey === card.key)}
          onCrop={() => onCrop(card.key)}
          onImage={(file) => onImage(card.key, file)}
          onOpen={() => onOpen(card.key)}
        />
      ))}
    </div>
  );
}
