-- Bristol Care Dashboard — Production Media Reference Summary
-- Read-only: counts of media fields in album_items and love_notes.
-- Output: table_name, media_kind, total_count, path_present_count,
--         url_only_count, external_url_count, unparseable_count.
-- Do NOT output actual URLs or object paths.

WITH album_stats AS (
  SELECT
    'album_items' AS table_name,
    'image' AS media_kind,
    COUNT(*) AS total_count,
    COUNT(image_path) FILTER (WHERE image_path IS NOT NULL AND image_path != '') AS path_present_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND (image_path IS NULL OR image_path = '')) AS url_only_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url NOT LIKE '%supabase%') AS external_url_count,
    0 AS unparseable_count
  FROM album_items
  WHERE image_url IS NOT NULL AND image_url != ''
  UNION ALL
  SELECT
    'album_items',
    'video',
    COUNT(*),
    COUNT(video_path) FILTER (WHERE video_path IS NOT NULL AND video_path != ''),
    COUNT(*) FILTER (WHERE video_url IS NOT NULL AND video_url != '' AND (video_path IS NULL OR video_path = '')),
    COUNT(*) FILTER (WHERE video_url IS NOT NULL AND video_url NOT LIKE '%supabase%'),
    0
  FROM album_items
  WHERE video_url IS NOT NULL AND video_url != ''
),
note_stats AS (
  SELECT
    'love_notes' AS table_name,
    'image' AS media_kind,
    COUNT(*) AS total_count,
    COUNT(image_path) FILTER (WHERE image_path IS NOT NULL AND image_path != '') AS path_present_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '' AND (image_path IS NULL OR image_path = '')) AS url_only_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url NOT LIKE '%supabase%') AS external_url_count,
    0 AS unparseable_count
  FROM love_notes
  WHERE image_url IS NOT NULL AND image_url != '' AND deleted_at IS NULL
  UNION ALL
  SELECT
    'love_notes',
    'audio',
    COUNT(*),
    COUNT(audio_path) FILTER (WHERE audio_path IS NOT NULL AND audio_path != ''),
    COUNT(*) FILTER (WHERE audio_url IS NOT NULL AND audio_url != '' AND (audio_path IS NULL OR audio_path = '')),
    COUNT(*) FILTER (WHERE audio_url IS NOT NULL AND audio_url NOT LIKE '%supabase%'),
    0
  FROM love_notes
  WHERE audio_url IS NOT NULL AND audio_url != '' AND deleted_at IS NULL
  UNION ALL
  SELECT
    'love_notes',
    'video',
    COUNT(*),
    COUNT(video_path) FILTER (WHERE video_path IS NOT NULL AND video_path != ''),
    COUNT(*) FILTER (WHERE video_url IS NOT NULL AND video_url != '' AND (video_path IS NULL OR video_path = '')),
    COUNT(*) FILTER (WHERE video_url IS NOT NULL AND video_url NOT LIKE '%supabase%'),
    0
  FROM love_notes
  WHERE video_url IS NOT NULL AND video_url != '' AND deleted_at IS NULL
)
SELECT * FROM album_stats
UNION ALL
SELECT * FROM note_stats
ORDER BY table_name, media_kind;
