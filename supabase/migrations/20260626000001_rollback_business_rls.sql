-- DRAFT ROLLBACK — DO NOT APPLY UNTIL PRODUCTION RLS VERIFICATION IS COMPLETE.
-- Rolls back only Security Phase S2 policy names. It does not drop data.

begin;

drop policy if exists "s2 service api only couple_spaces" on public.couple_spaces;
drop policy if exists "s2 service api only settings" on public.settings;
drop policy if exists "s2 service api only courses" on public.courses;
drop policy if exists "s2 service api only deadlines" on public.deadlines;
drop policy if exists "s2 service api only love_notes" on public.love_notes;
drop policy if exists "s2 service api only album_items" on public.album_items;
drop policy if exists "s2 service api only miss_you_events" on public.miss_you_events;
drop policy if exists "s2 service api only miss_you_seen_state" on public.miss_you_seen_state;
drop policy if exists "s2 service api only period_records" on public.period_records;
drop policy if exists "s2 service api only push_subscriptions" on public.push_subscriptions;
drop policy if exists "s2 service api only reminder_preferences" on public.reminder_preferences;
drop policy if exists "s2 service api only reminder_delivery_log" on public.reminder_delivery_log;
drop policy if exists "s2 service api only reminder_run_logs" on public.reminder_run_logs;
drop policy if exists "s2 service api only user_identities" on public.user_identities;
drop policy if exists "s2 service api only content_interactions" on public.content_interactions;
drop policy if exists "s2 service api only content_comments" on public.content_comments;
drop policy if exists "s2 service api only content_reads" on public.content_reads;
drop policy if exists "s2 service api only space_locations" on public.space_locations;

-- RLS remains enabled by default. Disable it only after restoring a reviewed
-- previous policy set from production backup or migration history.

commit;
