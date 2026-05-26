"use client";

import {
  CARD_WALLET_ITEMS,
  getDefaultCardCrop,
  makeWalletCard,
  normalizeCardCrop,
  reorderWalletCardsPure,
  type CardCrop,
  type WalletCard,
  type WalletCardInput
} from "./cardWallet";

const DB_NAME = "bristol_card_wallet";
const DB_VERSION = 2;
const CARDS_STORE = "wallet_cards";
const IMAGE_STORE = "card_images";
const SETTINGS_STORE = "card_settings";
const INIT_KEY = "bristol_card_wallet_initialized";

export type CardImageRecord = {
  cardId: string;
  cardKey?: string;
  blob: Blob;
  mimeType: string;
  updatedAt: string;
};

export type CardSettingsRecord = {
  cardId: string;
  cardKey?: string;
  crop: CardCrop;
  brightnessMode?: "normal" | "bright";
  zoom?: number;
  rotate?: number;
  updatedAt: string;
};

export type CardState = {
  cardId: string;
  hasImage: boolean;
  updatedAt?: string;
  crop: CardCrop;
};

function unavailable() {
  return typeof window === "undefined" || !("indexedDB" in window);
}

function markInitialized() {
  try {
    window.localStorage.setItem(INIT_KEY, "true");
  } catch {
    // LocalStorage is only a lightweight flag.
  }
}

function hasInitialized() {
  try {
    return window.localStorage.getItem(INIT_KEY) === "true";
  } catch {
    return false;
  }
}

export function openCardWalletDb(): Promise<IDBDatabase | null> {
  if (unavailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CARDS_STORE)) db.createObjectStore(CARDS_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "cardId" });
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, { keyPath: "cardId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openCardWalletDb();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const result = await withStore<T[]>(storeName, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
  return Array.isArray(result) ? result : [];
}

export async function initDefaultWalletCards() {
  const existing = await getAllFromStore<WalletCard>(CARDS_STORE);
  if (existing.length || hasInitialized()) return existing.sort((a, b) => a.sortOrder - b.sortOrder);
  await Promise.all(CARD_WALLET_ITEMS.map((card) => withStore(CARDS_STORE, "readwrite", (store) => store.put(card))));
  markInitialized();
  return [...CARD_WALLET_ITEMS];
}

export async function listWalletCards(): Promise<WalletCard[]> {
  await initDefaultWalletCards();
  const cards = await getAllFromStore<WalletCard>(CARDS_STORE);
  return cards.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getWalletCard(id: string): Promise<WalletCard | null> {
  return await withStore<WalletCard>(CARDS_STORE, "readonly", (store) => store.get(id));
}

export async function createWalletCard(input: WalletCardInput): Promise<WalletCard | null> {
  const cards = await listWalletCards();
  const card = makeWalletCard({ ...input, sortOrder: input.sortOrder ?? cards.length });
  await withStore(CARDS_STORE, "readwrite", (store) => store.put(card));
  markInitialized();
  return card;
}

export async function updateWalletCard(id: string, patch: Partial<WalletCard>): Promise<WalletCard | null> {
  const card = await getWalletCard(id);
  if (!card) return null;
  const next: WalletCard = {
    ...card,
    ...patch,
    id: card.id,
    key: patch.key || card.key,
    updatedAt: new Date().toISOString()
  };
  await withStore(CARDS_STORE, "readwrite", (store) => store.put(next));
  return next;
}

export async function deleteWalletCard(id: string) {
  await withStore(CARDS_STORE, "readwrite", (store) => store.delete(id));
  await deleteCardImage(id);
  await withStore(SETTINGS_STORE, "readwrite", (store) => store.delete(id));
}

export async function reorderWalletCards(ids: string[]) {
  const cards = await listWalletCards();
  const next = reorderWalletCardsPure(cards, ids);
  await Promise.all(next.map((card) => withStore(CARDS_STORE, "readwrite", (store) => store.put(card))));
  return next;
}

export async function saveCardImage(cardId: string, blob: Blob, metadata?: { mimeType?: string }) {
  const record: CardImageRecord = {
    cardId,
    cardKey: cardId,
    blob,
    mimeType: metadata?.mimeType || blob.type || "image/jpeg",
    updatedAt: new Date().toISOString()
  };
  await withStore(IMAGE_STORE, "readwrite", (store) => store.put(record));
  const existingCrop = await getCardCrop(cardId);
  const card = await getWalletCard(cardId);
  if (!existingCrop) await saveCardCrop(cardId, getDefaultCardCrop(card || "mixed"));
  return record;
}

export async function getCardImage(cardId: string): Promise<CardImageRecord | null> {
  return await withStore<CardImageRecord>(IMAGE_STORE, "readonly", (store) => store.get(cardId));
}

export async function deleteCardImage(cardId: string) {
  await withStore(IMAGE_STORE, "readwrite", (store) => store.delete(cardId));
}

export async function saveCardCrop(cardId: string, crop: CardCrop) {
  const card = await getWalletCard(cardId);
  const record: CardSettingsRecord = {
    cardId,
    cardKey: cardId,
    crop: normalizeCardCrop(crop, card || "mixed"),
    updatedAt: new Date().toISOString()
  };
  await withStore(SETTINGS_STORE, "readwrite", (store) => store.put(record));
  return record;
}

export async function getCardCrop(cardId: string): Promise<CardCrop | null> {
  const card = await getWalletCard(cardId);
  const record = await withStore<CardSettingsRecord>(SETTINGS_STORE, "readonly", (store) => store.get(cardId));
  return record?.crop ? normalizeCardCrop(record.crop, card || "mixed") : null;
}

export async function listCardStates(cards?: WalletCard[]): Promise<CardState[]> {
  const list = cards || await listWalletCards();
  return await Promise.all(list.map(async (card) => {
    const image = await getCardImage(card.id);
    const crop = await getCardCrop(card.id);
    return {
      cardId: card.id,
      hasImage: Boolean(image),
      updatedAt: image?.updatedAt,
      crop: crop || getDefaultCardCrop(card)
    };
  }));
}

export async function clearAllCardImages() {
  const cards = await listWalletCards();
  await Promise.all(cards.map((card) => deleteCardImage(card.id)));
}

export async function clearAllWalletCards() {
  const cards = await listWalletCards();
  await Promise.all(cards.map((card) => deleteWalletCard(card.id)));
  markInitialized();
}

export async function restoreDefaultWalletCards() {
  const cards = await listWalletCards();
  const existing = new Set(cards.map((card) => card.id));
  const missing = CARD_WALLET_ITEMS.filter((card) => !existing.has(card.id));
  await Promise.all(missing.map((card, index) => withStore(CARDS_STORE, "readwrite", (store) => store.put({ ...card, sortOrder: cards.length + index }))));
  markInitialized();
  return listWalletCards();
}
