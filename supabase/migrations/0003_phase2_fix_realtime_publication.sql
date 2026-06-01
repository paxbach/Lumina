-- ════════════════════════════════════════════════════════════════════
-- Lumina · Phase 2 — Fix Realtime publication membership
-- ────────────────────────────────────────────────────────────────────
-- Bug #2 (Activity feed not live) — root cause was that
-- `supabase_realtime` publication may not actually contain every
-- family_* table on a given project (migration 0001's
-- `alter publication ... add table` is not idempotent — re-running it
-- raises 'relation already member of publication' and any subsequent
-- statements in the same batch silently never execute).
--
-- This migration is idempotent: it checks pg_publication_tables before
-- attempting to add each table, so it is safe to run any number of
-- times. After this runs, `family_activities` INSERTs (and every other
-- family_* table) will reach connected clients via postgres_changes.
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tables text[] := array[
    'families',
    'family_members',
    'family_quests',
    'family_activities',
    'family_rewards'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        t
      );
      raise notice '[lumina] added % to supabase_realtime publication', t;
    else
      raise notice '[lumina] % already in supabase_realtime publication, skipping', t;
    end if;
  end loop;
end $$;

-- Optional diagnostic — uncomment to dump the publication membership
-- when you re-run the migration:
--
--   select schemaname, tablename
--     from pg_publication_tables
--    where pubname = 'supabase_realtime'
--    order by 1, 2;
