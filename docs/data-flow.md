# Data Flow

## Overview

Bristol Care Dashboard operates in two modes depending on Supabase configuration:

| Mode | Storage | Sync | Availability |
|---|---|---|---|
| **Cloud mode** | Supabase PostgreSQL + Storage | Auto-sync via `lib/autoSync.ts` | Multi-device |
| **Local mode** | Browser localStorage | None (single-device) | Offline-first |

## Cloud Mode Data Flow

```
┌──────────────────────────────────────────────────────┐
│                    Browser (Client)                    │
│                                                        │
│  ┌──────────┐   ┌──────────┐   ┌───────────────────┐ │
│  │ UI Mutate │ → │ Optimistic│ → │   Sync Queue      │ │
│  │ (write)   │   │ Local Save │   │ (if network fail) │ │
│  └──────────┘   └──────────┘   └─────────┬─────────┘ │
│                                            │           │
│  ┌──────────────────────────────────────┐ │           │
│  │         Auto Sync (debounced)        │◄┘           │
│  │  - flushSyncQueue()                  │             │
│  │  - POST/PATCH/DELETE to API          │             │
│  │  - retry on failure (max 5)          │             │
│  └────────────────┬─────────────────────┘             │
└───────────────────┼───────────────────────────────────┘
                    │ HTTP (fetch)
                    ▼
┌──────────────────────────────────────────────────────┐
│              Next.js API Routes (Server)              │
│                                                        │
│  /api/comments     /api/interactions                   │
│  /api/notes        /api/albums                         │
│  /api/miss-you     /api/read-state                     │
│  /api/cloud/sync   /api/cloud/pull                     │
│  /api/location     /api/weather                        │
│  /api/admin/*      /api/cron/reminders                 │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │ Supabase JS Client
                           ▼
┌──────────────────────────────────────────────────────┐
│                    Supabase                           │
│                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ PostgreSQL  │  │  Storage    │  │  Realtime      │  │
│  │             │  │  (public)   │  │  (not used)    │  │
│  │ love_notes  │  │ love-notes  │  │                │  │
│  │ album_items │  │ couple-     │  │                │  │
│  │ content_*   │  │   albums    │  │                │  │
│  │ miss_you_*  │  │ backgrounds │  │                │  │
│  │ space_*     │  │             │  │                │  │
│  └────────────┘  └────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Key Data Entities

### Content Tables (user-generated)

| Table | Key Fields | Storage |
|---|---|---|
| `love_notes` | `id`, `space_code`, `author_identity`, `content`, `image_url`, `video_url` | DB refs → Storage |
| `album_items` | `id`, `space_code`, `type`, `image_url`, `video_url`, `taken_at` | DB refs → Storage |
| `miss_you_events` | `id`, `space_code`, `identity`, `action_type`, `created_at` | DB only |

### Interaction Tables

| Table | Key Fields |
|---|---|
| `content_comments` | `space_code`, `content_type`, `content_id`, `identity`, `body` |
| `content_interactions` | `space_code`, `content_type`, `content_id`, `identity`, `interaction_type` |
| `content_reads` | `space_code`, `content_type`, `content_id`, `identity`, `read_at` |

### System Tables

| Table | Purpose |
|---|---|
| `space_locations` | Geolocation snapshots (weather context) |
| `reminder_run_logs` | Cron job execution history |
| `couple_spaces` | Space configuration (code, settings) |

## Sync Model

### Auto Sync (`lib/autoSync.ts`)

- Debounced (default ~2s after last mutation)
- Triggers on: mutation, online event, visibility change, manual refresh
- Before sync: flushes sync queue
- During sync: fetches latest cloud state, merges with local

### Sync Queue (`lib/syncQueue.ts`)

- Queued when an API call fails (network error, server error)
- Retried automatically on next sync cycle
- Max 5 retries per item
- Items are idempotent (dedup by type+url+body)
- Queue visible in Settings → Sync Status

### Read State (`lib/readStateClient.ts`)

- Cloud mode: synced via `/api/read-state`
- Local mode: localStorage only
- Key format: `{contentType}:{contentId}`

## Offline Behavior

| Operation | Offline Behavior |
|---|---|
| Read content | Cached data from last sync |
| Write note/comment | Saved locally, queued for sync |
| Like/react | Optimistic local update, queued |
| Upload media | Queued for later upload |
| View albums | Cached thumbnails only |
| Weather data | Stale cache shown |
| Settings change | Saved locally, synced when online |
