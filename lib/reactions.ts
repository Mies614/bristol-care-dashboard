"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

/**
 * Lightweight reactions for love notes.
 *
 * Each note can have reactions from users.
 * Supported reactions: ❤️ heart, 🫶 hug, 🌙 night
 *
 * Stored in localStorage per identity + spaceCode.
 * This is device-local state — NOT synced to Supabase.
 * Export/backup does not include reactions.
 */

export type ReactionId = "heart" | "hug" | "night";

export const REACTIONS: { id: ReactionId; emoji: string; label: string }[] = [
  { id: "heart", emoji: "❤️", label: "喜欢" },
  { id: "hug", emoji: "🫶", label: "想你" },
  { id: "night", emoji: "🌙", label: "晚安" },
];

interface ReactionState {
  count: number;
  users: string[];
}

type ReactionsMap = Record<string, Record<string, ReactionState>>;

const STORAGE_PREFIX = "bristol_dashboard_reactions";

function getStorageKey(spaceCode: string): string {
  return `${STORAGE_PREFIX}_${spaceCode || "default"}`;
}

function loadReactions(spaceCode: string): ReactionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(getStorageKey(spaceCode));
    return raw ? (JSON.parse(raw) as ReactionsMap) : {};
  } catch {
    return {};
  }
}

function saveReactions(spaceCode: string, map: ReactionsMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(spaceCode), JSON.stringify(map));
  } catch {
    // Non-critical
  }
}

function getCurrentUser(): string {
  return DEFAULT_NORMAL_IDENTITY_ID;
}

/**
 * Add a reaction to a note. Returns the new count.
 */
export function addReaction(noteId: string, reactionId: ReactionId, spaceCode = "default"): number {
  const map = loadReactions(spaceCode);
  const user = getCurrentUser();

  if (!map[noteId]) map[noteId] = {};
  if (!map[noteId][reactionId]) {
    map[noteId][reactionId] = { count: 0, users: [] };
  }

  const state = map[noteId][reactionId];
  if (state.users.includes(user)) return state.count;

  state.count += 1;
  state.users.push(user);
  saveReactions(spaceCode, map);
  return state.count;
}

/**
 * Remove a reaction from a note. Returns the new count.
 */
export function removeReaction(noteId: string, reactionId: ReactionId, spaceCode = "default"): number {
  const map = loadReactions(spaceCode);
  const user = getCurrentUser();

  if (!map[noteId]?.[reactionId]) return 0;

  const state = map[noteId][reactionId];
  const idx = state.users.indexOf(user);
  if (idx !== -1) {
    state.users.splice(idx, 1);
    state.count = Math.max(0, state.count - 1);
  }

  if (state.count === 0) {
    delete map[noteId][reactionId];
    if (Object.keys(map[noteId]).length === 0) {
      delete map[noteId];
    }
  }

  saveReactions(spaceCode, map);
  return state.count;
}

/**
 * Check if current user has already reacted.
 */
export function hasReaction(noteId: string, reactionId: ReactionId, spaceCode = "default"): boolean {
  const map = loadReactions(spaceCode);
  const user = getCurrentUser();
  return map[noteId]?.[reactionId]?.users.includes(user) ?? false;
}

/**
 * Get reaction counts for a note.
 */
export function getReactionsForNote(noteId: string, spaceCode = "default"): Array<{ id: ReactionId; emoji: string; count: number; active: boolean }> {
  const map = loadReactions(spaceCode);
  const user = getCurrentUser();
  const noteReactions = map[noteId] || {};

  return REACTIONS.map((r) => ({
    id: r.id,
    emoji: r.emoji,
    count: noteReactions[r.id]?.count || 0,
    active: noteReactions[r.id]?.users.includes(user) ?? false,
  }));
}

/**
 * Get total reaction count across all types for a note.
 */
export function getTotalReactionCount(noteId: string, spaceCode = "default"): number {
  const reactions = getReactionsForNote(noteId, spaceCode);
  return reactions.reduce((sum, r) => sum + r.count, 0);
}