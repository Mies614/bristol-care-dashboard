/**
 * Client-side sync queue for automatic retry of failed cloud writes.
 *
 * Each mutation that fails to reach the server is queued locally
 * and automatically retried when:
 * 1. The next autoSync cycle runs
 * 2. The browser comes back online
 * 3. Manually via "retry" button in settings
 *
 * Queue items are idempotent — the server side must handle duplicates gracefully.
 */

export type SyncQueueItemType = "note" | "comment" | "interaction" | "miss_you" | "album" | "settings";

export interface SyncQueueItem {
  id: string;
  type: SyncQueueItemType;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body: Record<string, unknown>;
  spaceCode: string;
  identity: string;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
}

const QUEUE_KEY = "bristol_sync_queue_v1";
const MAX_RETRIES = 5;

// ─── Read / Write ────────────────────────────────────

function loadQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: SyncQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Storage full — non-critical; items remain in memory
  }
}

// ─── Public API ──────────────────────────────────────

/** Add a failed mutation to the sync queue for later retry. */
export function enqueueSyncItem(item: Omit<SyncQueueItem, "id" | "retryCount" | "maxRetries" | "createdAt">): void {
  const queue = loadQueue();
  // Deduplicate: skip if same type + body already queued
  const exists = queue.some(
    (q) => q.type === item.type && q.url === item.url && JSON.stringify(q.body) === JSON.stringify(item.body)
  );
  if (exists) return;

  const newItem: SyncQueueItem = {
    ...item,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  saveQueue(queue);
}

/** Remove a successfully processed item from the queue. */
export function dequeueSyncItem(id: string): void {
  const queue = loadQueue();
  saveQueue(queue.filter((item) => item.id !== id));
}

/** Get current queue state. */
export function getSyncQueue(): SyncQueueItem[] {
  return loadQueue();
}

/** Get count of pending items. */
export function getPendingSyncCount(): number {
  return loadQueue().filter((item) => item.retryCount < item.maxRetries).length;
}

/** Get count of permanently failed items (exceeded max retries). */
export function getFailedSyncCount(): number {
  return loadQueue().filter((item) => item.retryCount >= item.maxRetries).length;
}

/** Remove all permanently failed items. */
export function clearFailedSyncItems(): void {
  const queue = loadQueue();
  saveQueue(queue.filter((item) => item.retryCount < item.maxRetries));
}

/** Process all pending items. Returns counts of successes and failures. */
export async function flushSyncQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = loadQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    if (item.retryCount >= item.maxRetries) {
      remaining.push(item); // keep failed items for visibility
      failed++;
      continue;
    }
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        succeeded++;
      } else {
        item.retryCount++;
        remaining.push(item);
        failed++;
      }
    } catch {
      item.retryCount++;
      remaining.push(item);
      failed++;
    }
  }

  saveQueue(remaining);
  return { succeeded, failed };
}
