"use client";

import { CARD_WALLET_ITEMS, getDefaultCardCrop, normalizeCardCrop, type CardCrop, type CardWalletKey } from "./cardWallet";

const DB_NAME = "bristol_card_wallet";
const DB_VERSION = 1;
const IMAGE_STORE = "card_images";
const SETTINGS_STORE = "card_settings";

export type CardImageRecord = {
  cardKey: CardWalletKey;
  blob: Blob;
  mimeType: string;
  updatedAt: string;
};

export type CardSettingsRecord = {
  cardKey: CardWalletKey;
  crop: CardCrop;
  brightnessMode?: "normal" | "bright";
  zoom?: number;
  rotate?: number;
  updatedAt: string;
};

export type CardState = {
  cardKey: CardWalletKey;
  hasImage: boolean;
  updatedAt?: string;
  crop: CardCrop;
};

function unavailable() {
  return typeof window === "undefined" || !("indexedDB" in window);
}

export function openCardWalletDb(): Promise<IDBDatabase | null> {
  if (unavailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "cardKey" });
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, { keyPath: "cardKey" });
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
  if (!db) return null;
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

export async function saveCardImage(cardKey: CardWalletKey, blob: Blob, metadata?: { mimeType?: string }) {
  const record: CardImageRecord = {
    cardKey,
    blob,
    mimeType: metadata?.mimeType || blob.type || "image/jpeg",
    updatedAt: new Date().toISOString()
  };
  await withStore(IMAGE_STORE, "readwrite", (store) => store.put(record));
  const existingCrop = await getCardCrop(cardKey);
  if (!existingCrop) await saveCardCrop(cardKey, getDefaultCardCrop(cardKey));
  return record;
}

export async function getCardImage(cardKey: CardWalletKey): Promise<CardImageRecord | null> {
  return await withStore<CardImageRecord>(IMAGE_STORE, "readonly", (store) => store.get(cardKey));
}

export async function deleteCardImage(cardKey: CardWalletKey) {
  await withStore(IMAGE_STORE, "readwrite", (store) => store.delete(cardKey));
}

export async function saveCardCrop(cardKey: CardWalletKey, crop: CardCrop) {
  const record: CardSettingsRecord = {
    cardKey,
    crop: normalizeCardCrop(crop, cardKey),
    updatedAt: new Date().toISOString()
  };
  await withStore(SETTINGS_STORE, "readwrite", (store) => store.put(record));
  return record;
}

export async function getCardCrop(cardKey: CardWalletKey): Promise<CardCrop | null> {
  const record = await withStore<CardSettingsRecord>(SETTINGS_STORE, "readonly", (store) => store.get(cardKey));
  return record?.crop ? normalizeCardCrop(record.crop, cardKey) : null;
}

export async function listCardStates(): Promise<CardState[]> {
  const states = await Promise.all(CARD_WALLET_ITEMS.map(async (item) => {
    const image = await getCardImage(item.key);
    const crop = await getCardCrop(item.key);
    return {
      cardKey: item.key,
      hasImage: Boolean(image),
      updatedAt: image?.updatedAt,
      crop: crop || getDefaultCardCrop(item.key)
    };
  }));
  return states;
}

export async function clearAllCardImages() {
  await Promise.all(CARD_WALLET_ITEMS.map((item) => deleteCardImage(item.key)));
}
