/**
 * localStorage fallback for content interactions and comments.
 *
 * Used when Supabase is unavailable. Stores likes and comments per
 * spaceCode + identity + contentType combination.
 *
 * Key format: bristol_int_${spaceCode}_${identity}_${contentType}
 * Reuses existing "bristol_interactions" fallback format.
 */

import type { ContentInteraction, ContentComment } from "./contentInteractions";

const LS_INTERACTIONS_KEY = (spaceCode: string, identity: string, contentType: string) =>
  `bristol_int_${spaceCode}_${identity}_${contentType}`;

const LS_COMMENTS_KEY = (spaceCode: string, identity: string, contentType: string) =>
  `bristol_cmt_${spaceCode}_${identity}_${contentType}`;

// ─── Interactions ───

export function getLocalInteractions(
  spaceCode: string,
  identity: string,
  contentType: string
): ContentInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_INTERACTIONS_KEY(spaceCode, identity, contentType));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalInteractions(
  spaceCode: string,
  identity: string,
  contentType: string,
  interactions: ContentInteraction[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_INTERACTIONS_KEY(spaceCode, identity, contentType),
      JSON.stringify(interactions)
    );
  } catch {
    // Storage full or unavailable — non-critical
  }
}

export function addLocalInteraction(
  spaceCode: string,
  interaction: ContentInteraction
): void {
  const existing = getLocalInteractions(spaceCode, interaction.identity, interaction.contentType);
  // Deduplicate: same contentId + identity + interactionType
  const filtered = existing.filter(
    (i) =>
      !(
        i.contentId === interaction.contentId &&
        i.identity === interaction.identity &&
        i.interactionType === interaction.interactionType &&
        (i.reaction || "") === (interaction.reaction || "")
      )
  );
  filtered.push(interaction);
  saveLocalInteractions(spaceCode, interaction.identity, interaction.contentType, filtered);
}

export function removeLocalInteraction(
  spaceCode: string,
  contentType: string,
  contentId: string,
  identity: string,
  interactionType: string,
  reaction?: string
): void {
  const existing = getLocalInteractions(spaceCode, identity, contentType);
  const filtered = existing.filter(
    (i) =>
      !(
        i.contentId === contentId &&
        i.identity === identity &&
        i.interactionType === interactionType &&
        (i.reaction || "") === (reaction || "")
      )
  );
  saveLocalInteractions(spaceCode, identity, contentType, filtered);
}

// ─── Comments ───

export function getLocalComments(
  spaceCode: string,
  contentType: string
): ContentComment[] {
  if (typeof window === "undefined") return [];
  const all: ContentComment[] = [];
  // Local comments are stored per identity; iterate known identities
  const knownIdentities = ["xiaoguai", "me", "admin"];
  try {
    for (const identity of knownIdentities) {
      const raw = window.localStorage.getItem(LS_COMMENTS_KEY(spaceCode, identity, contentType));
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        all.push(...parsed);
      }
    }
    return all;
  } catch {
    return [];
  }
}

export function saveLocalComments(
  spaceCode: string,
  identity: string,
  contentType: string,
  comments: ContentComment[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_COMMENTS_KEY(spaceCode, identity, contentType),
      JSON.stringify(comments)
    );
  } catch {
    // Storage full or unavailable — non-critical
  }
}

export function addLocalComment(
  spaceCode: string,
  comment: ContentComment
): void {
  const existing = getLocalComments(spaceCode, comment.contentType);
  const filtered = existing.filter((c) => c.id !== comment.id);
  filtered.push(comment);
  saveLocalComments(spaceCode, comment.identity, comment.contentType, filtered);
}

export function softDeleteLocalComment(
  spaceCode: string,
  contentType: string,
  commentId: string
): void {
  if (typeof window === "undefined") return;
  const all = getLocalComments(spaceCode, contentType);
  const updated = all.map((c) => {
    if (c.id === commentId) {
      return { ...c, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
    return c;
  });
  // Reorganize: save back per identity
  const byIdentity: Record<string, ContentComment[]> = {};
  for (const c of updated) {
    const key = c.identity || "xiaoguai";
    if (!byIdentity[key]) byIdentity[key] = [];
    byIdentity[key].push(c);
  }
  for (const [identity, comments] of Object.entries(byIdentity)) {
    saveLocalComments(spaceCode, identity, contentType, comments);
  }
}

export function restoreLocalComment(
  spaceCode: string,
  contentType: string,
  commentId: string
): void {
  if (typeof window === "undefined") return;
  const all = getLocalComments(spaceCode, contentType);
  const updated = all.map((c) => {
    if (c.id === commentId) {
      return { ...c, deletedAt: undefined, updatedAt: new Date().toISOString() };
    }
    return c;
  });
  const byIdentity: Record<string, ContentComment[]> = {};
  for (const c of updated) {
    const key = c.identity || "xiaoguai";
    if (!byIdentity[key]) byIdentity[key] = [];
    byIdentity[key].push(c);
  }
  for (const [identity, comments] of Object.entries(byIdentity)) {
    saveLocalComments(spaceCode, identity, contentType, comments);
  }
}

export function hardDeleteLocalComment(
  spaceCode: string,
  contentType: string,
  commentId: string
): void {
  if (typeof window === "undefined") return;
  const all = getLocalComments(spaceCode, contentType);
  const filtered = all.filter((c) => c.id !== commentId);
  const byIdentity: Record<string, ContentComment[]> = {};
  for (const c of filtered) {
    const key = c.identity || "xiaoguai";
    if (!byIdentity[key]) byIdentity[key] = [];
    byIdentity[key].push(c);
  }
  for (const [identity, comments] of Object.entries(byIdentity)) {
    saveLocalComments(spaceCode, identity, contentType, comments);
  }
}