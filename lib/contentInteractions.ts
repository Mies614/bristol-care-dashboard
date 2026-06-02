/**
 * Pure-function interaction service for content (notes, albums, memories).
 *
 * No browser APIs, no Supabase, no side effects.
 * Operates on plain arrays of interactions and comments.
 */

// ─── Types ───

export type ContentType = "note" | "album" | "memory";

export type InteractionType = "read" | "like" | "reaction";

export interface ContentInteraction {
  id: string;
  spaceId?: string;
  contentType: ContentType;
  contentId: string;
  identity: string;
  interactionType: InteractionType;
  reaction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentComment {
  id: string;
  spaceId?: string;
  contentType: ContentType;
  contentId: string;
  identity: string;
  body: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReactionSummaryItem {
  reaction: string;
  count: number;
  active: boolean; // whether the given identity has this reaction
}

export interface InteractionSummary {
  readCount: number;
  hasRead: boolean;
  likeCount: number;
  hasLiked: boolean;
  reactions: ReactionSummaryItem[];
  commentCount: number;
}

export interface CommentEntry {
  id: string;
  identity: string;
  body: string;
  createdAt: string;
  deletedAt?: string;
  updatedAt?: string;
  /** Computed: whether this comment is soft-deleted */
  isDeleted: boolean;
  /** Computed: whether the current identity is the author */
  isMine: boolean;
}

// ─── Interaction helpers ───

/**
 * Filter interactions for a specific content item.
 */
export function getInteractionsForContent(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string
): ContentInteraction[] {
  return interactions.filter(
    (i) => i.contentType === contentType && i.contentId === contentId
  );
}

/**
 * Count reads for a content item.
 */
export function countReads(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string
): number {
  return getInteractionsForContent(interactions, contentType, contentId).filter(
    (i) => i.interactionType === "read"
  ).length;
}

/**
 * Check if a specific identity has read a content item.
 */
export function hasReadIdentity(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string,
  identity: string
): boolean {
  return getInteractionsForContent(interactions, contentType, contentId).some(
    (i) => i.interactionType === "read" && i.identity === identity
  );
}

/**
 * Count likes for a content item.
 */
export function countLikes(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string
): number {
  return getInteractionsForContent(interactions, contentType, contentId).filter(
    (i) => i.interactionType === "like"
  ).length;
}

/**
 * Check if a specific identity has liked a content item.
 */
export function hasLikedIdentity(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string,
  identity: string
): boolean {
  return getInteractionsForContent(interactions, contentType, contentId).some(
    (i) => i.interactionType === "like" && i.identity === identity
  );
}

/**
 * Get reaction counts for a content item, grouped by reaction type.
 */
export function getReactionCounts(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  const relevant = getInteractionsForContent(interactions, contentType, contentId).filter(
    (i) => i.interactionType === "reaction" && i.reaction
  );
  for (const i of relevant) {
    const key = i.reaction!;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Check if a specific identity has a specific reaction on a content item.
 */
export function hasReactionIdentity(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string,
  identity: string,
  reaction: string
): boolean {
  return getInteractionsForContent(interactions, contentType, contentId).some(
    (i) =>
      i.interactionType === "reaction" &&
      i.identity === identity &&
      i.reaction === reaction
  );
}

/**
 * Build a reaction summary array for a content item from a given identity's perspective.
 */
export function getReactionSummary(
  interactions: ContentInteraction[],
  contentType: ContentType,
  contentId: string,
  identity: string,
  supportedReactions: Array<{ id: string; emoji: string; label: string }>
): ReactionSummaryItem[] {
  const counts = getReactionCounts(interactions, contentType, contentId);
  return supportedReactions.map((r) => ({
    reaction: r.id,
    count: counts[r.id] || 0,
    active: hasReactionIdentity(interactions, contentType, contentId, identity, r.id),
  }));
}

// ─── Comment helpers ───

/**
 * Filter active (non-deleted) comments for a content item.
 */
export function filterActiveComments(
  comments: ContentComment[],
  contentType: ContentType,
  contentId: string
): ContentComment[] {
  return comments.filter(
    (c) =>
      c.contentType === contentType &&
      c.contentId === contentId &&
      !c.deletedAt
  );
}

/**
 * Count active comments for a content item.
 */
export function countComments(
  comments: ContentComment[],
  contentType: ContentType,
  contentId: string
): number {
  return filterActiveComments(comments, contentType, contentId).length;
}

/**
 * Build comment entries (with isMine / isDeleted flags) for UI rendering.
 */
export function buildCommentEntries(
  comments: ContentComment[],
  contentType: ContentType,
  contentId: string,
  currentIdentity: string
): CommentEntry[] {
  const relevant = comments.filter(
    (c) => c.contentType === contentType && c.contentId === contentId
  );
  return relevant
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((c) => ({
      id: c.id,
      identity: c.identity,
      body: c.body,
      createdAt: c.createdAt,
      isDeleted: Boolean(c.deletedAt),
      isMine: c.identity === currentIdentity,
    }));
}

// ─── Summary ───

/**
 * Build a complete interaction summary for a content item.
 */
export function buildInteractionSummary(
  interactions: ContentInteraction[],
  comments: ContentComment[],
  contentType: ContentType,
  contentId: string,
  identity: string,
  supportedReactions: Array<{ id: string; emoji: string; label: string }>
): InteractionSummary {
  return {
    readCount: countReads(interactions, contentType, contentId),
    hasRead: hasReadIdentity(interactions, contentType, contentId, identity),
    likeCount: countLikes(interactions, contentType, contentId),
    hasLiked: hasLikedIdentity(interactions, contentType, contentId, identity),
    reactions: getReactionSummary(interactions, contentType, contentId, identity, supportedReactions),
    commentCount: countComments(comments, contentType, contentId),
  };
}

// ─── Merge helpers ───

/**
 * Merge remote and local interactions, removing local duplicates that already exist remotely.
 * Dedup key: contentType + contentId + identity + interactionType + reaction
 */
export function mergeInteractions(
  remote: ContentInteraction[],
  local: ContentInteraction[]
): ContentInteraction[] {
  const dedupKey = (i: ContentInteraction) =>
    `${i.contentType}|${i.contentId}|${i.identity}|${i.interactionType}|${i.reaction || ""}`;
  const remoteKeys = new Set(remote.map(dedupKey));
  const uniqueLocal = local.filter((i) => !remoteKeys.has(dedupKey(i)));
  return [...remote, ...uniqueLocal];
}

/**
 * Merge remote and local comments, removing local duplicates by id.
 */
export function mergeComments(
  remote: ContentComment[],
  local: ContentComment[]
): ContentComment[] {
  const remoteIds = new Set(remote.map((c) => c.id));
  const uniqueLocal = local.filter((c) => !remoteIds.has(c.id));
  return [...remote, ...uniqueLocal];
}