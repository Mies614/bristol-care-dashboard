"use client";

/**
 * Lightweight reactions for love notes.
 *
 * Each note can have reactions from users.
 * Supported reactions: ❤️ heart, 🫶 hug, 🌙 night
 *
 * Stored in localStorage per identity.
 * Format: { [noteId]: { [reactionId]: { count: number, users: string[] } } }
 */

export type ReactionId = "heart" | "hug" | "night";

export const REACTIONS: { id: ReactionId; emoji: string; label: string }[] = [
  { id: "heart", emoji: "❤️", label: "喜欢" },
  { id: "hug", emoji: "🫶", label: "想你" },
  { id: "night", emoji: "🌙", label: "晚安" },
];

interface ReactionState {
  count: number;
  /** Who has reacted (identity keys) */
  users: string[];
}

type ReactionsMap = Record<string, Record<string, ReactionState>>; // noteId -> reactionId -> state

const STORAGE_KEY = "bristol_dashboard_reactions";

function loadReactions(): ReactionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReactionsMap) : {};
  } catch {
    return {};
  }
}

function saveReactions(map: ReactionsMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Non-critical
  }
}

function getCurrentUser(): string {
  return "xiaoguai";
}

/**
 * Add a reaction to a note. Returns the new count.
 */
export function addReaction(noteId: string, reactionId: ReactionId): number {
  const map = loadReactions();
  const user = getCurrentUser();

  if (!map[noteId]) map[noteId] = {};
  if (!map[noteId][reactionId]) {
    map[noteId][reactionId] = { count: 0, users: [] };
  }

  const state = map[noteId][reactionId];

  // Don't double-count the same user
  if (state.users.includes(user)) return state.count;

  state.count += 1;
  state.users.push(user);
  saveReactions(map);
  return state.count;
}

/**
 * Remove a reaction from a note. Returns the new count.
 */
export function removeReaction(noteId: string, reactionId: ReactionId): number {
  const map = loadReactions();
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

  saveReactions(map);
  return state.count;
}

/**
 * Check if current user has already reacted with a specific reaction.
 */
export function hasReaction(noteId: string, reactionId: ReactionId): boolean {
  const map = loadReactions();
  const user = getCurrentUser();
  return map[noteId]?.[reactionId]?.users.includes(user) ?? false;
}

/**
 * Get reaction counts for a note.
 */
export function getReactionsForNote(noteId: string): Array<{ id: ReactionId; emoji: string; count: number; active: boolean }> {
  const map = loadReactions();
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
export function getTotalReactionCount(noteId: string): number {
  const reactions = getReactionsForNote(noteId);
  return reactions.reduce((sum, r) => sum + r.count, 0);
}
