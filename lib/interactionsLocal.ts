"use client";

/**
 * localStorage fallback for content interactions and comments.
 * Used when Supabase is unavailable — all data stays in the browser.
 *
 * Stored under a single key per spaceCode to keep things clean.
 */

import type { ContentInteraction, ContentComment } from "@/lib/contentInteractions";

const STORAGE_PREFIX = "bristol_interactions_";
const COMMENTS_PREFIX = "bristol_comments_";

function storageKey(spaceCode: string): string {
  return `${STORAGE_PREFIX}${spaceCode}`;
}

function commentsStorageKey(spaceCode: string): string {
  return `${COMMENTS_PREFIX}${spaceCode}`;
}

// ─── Interactions ───

export function getLocalInteractions(spaceCode: string): ContentInteraction[] {
  try {
    const raw = localStorage.getItem(storageKey(spaceCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalInteractions(spaceCode: string, interactions: ContentInteraction[]): void {
  try {
    localStorage.setItem(storageKey(spaceCode), JSON.stringify(interactions));
  } catch {
    // silently ignore, storage may be full
  }
}

export function addLocalInteraction(spaceCode: string, interaction: ContentInteraction): ContentInteraction[] {
  const existing = getLocalInteractions(spaceCode);
  // Dedup: same contentType + contentId + identity + interactionType + reaction
  const idx = existing.findIndex(
    (i) =>
      i.contentType === interaction.contentType &&
      i.contentId === interaction.contentId &&
      i.identity === interaction.identity &&
      i.interactionType === interaction.interactionType &&
      (i.reaction || "") === (interaction.reaction || "")
  );
  if (idx >= 0) {
    existing[idx] = { ...interaction, createdAt: existing[idx].createdAt };
  } else {
    existing.push(interaction);
  }
  saveLocalInteractions(spaceCode, existing);
  return existing;
}

export function removeLocalInteraction(
  spaceCode: string,
  contentType: string,
  contentId: string,
  identity: string,
  interactionType: string,
  reaction?: string
): ContentInteraction[] {
  const existing = getLocalInteractions(spaceCode).filter(
    (i) =>
      !(
        i.contentType === contentType &&
        i.contentId === contentId &&
        i.identity === identity &&
        i.interactionType === interactionType &&
        (i.reaction || "") === (reaction || "")
      )
  );
  saveLocalInteractions(spaceCode, existing);
  return existing;
}

// ─── Comments ───

export function getLocalComments(spaceCode: string): ContentComment[] {
  try {
    const raw = localStorage.getItem(commentsStorageKey(spaceCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalComments(spaceCode: string, comments: ContentComment[]): void {
  try {
    localStorage.setItem(commentsStorageKey(spaceCode), JSON.stringify(comments));
  } catch {
    // silently ignore
  }
}

export function addLocalComment(spaceCode: string, comment: ContentComment): ContentComment[] {
  const existing = getLocalComments(spaceCode);
  existing.push(comment);
  saveLocalComments(spaceCode, existing);
  return existing;
}

export function softDeleteLocalComment(spaceCode: string, commentId: string): ContentComment[] {
  const existing = getLocalComments(spaceCode).map((c) =>
    c.id === commentId ? { ...c, deletedAt: new Date().toISOString() } : c
  );
  saveLocalComments(spaceCode, existing);
  return existing;
}

// ─── Legacy migration helpers ───

/**
 * Attempt to migrate old readState (from lib/readState.ts) into the new format.
 * Old format: Set<string> stored as JSON array of note IDs.
 * Call this once on app load.
 */
export function migrateOldReadState(spaceCode: string, identity: string): boolean {
  try {
    const oldKey = "bristol_dashboard_read_notes";
    const oldRaw = localStorage.getItem(oldKey);
    if (!oldRaw) return false;
    const oldIds: string[] = JSON.parse(oldRaw);
    if (!Array.isArray(oldIds) || oldIds.length === 0) return false;

    const existing = getLocalInteractions(spaceCode);
    const now = new Date().toISOString();
    let changed = false;

    for (const noteId of oldIds) {
      const alreadyExists = existing.some(
        (i) =>
          i.contentType === "note" &&
          i.contentId === noteId &&
          i.identity === identity &&
          i.interactionType === "read"
      );
      if (!alreadyExists) {
        existing.push({
          id: `migrated_${spaceCode}_read_${noteId}_${identity}`,
          contentType: "note",
          contentId: noteId,
          identity,
          interactionType: "read",
          createdAt: now,
          updatedAt: now,
        });
        changed = true;
      }
    }

    if (changed) {
      saveLocalInteractions(spaceCode, existing);
      // Remove old key to avoid re-migration
      localStorage.removeItem(oldKey);
    }
    return changed;
  } catch {
    return false;
  }
}

/**
 * Migrate old reactions (from lib/reactions.ts) into the new format.
 * Old format: Record<string, string[]> — { noteId: [reaction1, reaction2] }
 * Call this once on app load.
 */
export function migrateOldReactions(spaceCode: string, identity: string): boolean {
  try {
    const oldKey = "bristol_dashboard_reactions";
    const oldRaw = localStorage.getItem(oldKey);
    if (!oldRaw) return false;
    const oldData: Record<string, string[]> = JSON.parse(oldRaw);
    if (!oldData || typeof oldData !== "object") return false;

    const existing = getLocalInteractions(spaceCode);
    const now = new Date().toISOString();
    let changed = false;

    for (const [noteId, reactions] of Object.entries(oldData)) {
      if (!Array.isArray(reactions)) continue;
      for (const reaction of reactions) {
        const alreadyExists = existing.some(
          (i) =>
            i.contentType === "note" &&
            i.contentId === noteId &&
            i.identity === identity &&
            i.interactionType === "reaction" &&
            i.reaction === reaction
        );
        if (!alreadyExists) {
          existing.push({
            id: `migrated_${spaceCode}_reaction_${noteId}_${reaction}_${identity}`,
            contentType: "note",
            contentId: noteId,
            identity,
            interactionType: "reaction",
            reaction,
            createdAt: now,
            updatedAt: now,
          });
          changed = true;
        }
      }
    }

    if (changed) {
      saveLocalInteractions(spaceCode, existing);
      localStorage.removeItem(oldKey);
    }
    return changed;
  } catch {
    return false;
  }
}