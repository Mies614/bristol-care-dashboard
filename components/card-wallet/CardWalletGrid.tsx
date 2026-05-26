"use client";

import { CardWalletCard } from "./CardWalletCard";
import type { WalletCard } from "@/lib/cardWallet";
import type { CardState } from "@/lib/cardWalletDb";

export function CardWalletGrid({
  states,
  cards,
  isSorting,
  onOpen,
  onCrop,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onImage
}: {
  cards: WalletCard[];
  states: CardState[];
  isSorting?: boolean;
  onOpen: (id: string) => void;
  onCrop: (id: string) => void;
  onEdit: (card: WalletCard) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onImage: (id: string, file: File) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((card, index) => (
        <CardWalletCard
          card={card}
          isFirst={index === 0}
          isLast={index === cards.length - 1}
          isSorting={isSorting}
          key={card.id}
          state={states.find((state) => state.cardId === card.id)}
          onCrop={() => onCrop(card.id)}
          onDelete={() => onDelete(card.id)}
          onEdit={() => onEdit(card)}
          onImage={(file) => onImage(card.id, file)}
          onMoveDown={() => onMoveDown(card.id)}
          onMoveUp={() => onMoveUp(card.id)}
          onOpen={() => onOpen(card.id)}
        />
      ))}
    </div>
  );
}
