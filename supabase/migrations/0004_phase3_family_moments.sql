-- ════════════════════════════════════════════════════════════════════
-- Lumina · Phase 3 — Family Moments & Photo Journal
-- ────────────────────────────────────────────────────────────────────
-- Adds one new table (family_moments) that backs the Journal, Album,
-- and Memory Score. The existing family_quests / family_activities /
-- family_rewards tables are untouched — only their event kinds are
-- extended (CHECK constraint relaxed below).
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────── family_moments ──────────────────────────
-- One row per captured photo. The photo file itself lives in the
-- Supabase Storage bucket `family-photos` at
--   {family_id}/{YYYY-MM}/{id}.jpg
-- We store the storage path (not a signed URL) so the client can mint
-- signed URLs at read time and we can rotate keys without rewriting
-- rows.

create table public.family_moments (
  id              uuid        primary key default gen_random_uuid(),
  family_id       uuid        not null references public.families(id) on delete cascade,
  -- Optional quest linkage. NULL = a standalone moment not tied to any
  -- quest (e.g. "I just want to remember this dinner"). Quest deletion
  -- detaches but never removes the memory.
  quest_id        uuid        references public.family_quests(id) on delete set null,
  -- Optional task key inside the quest. Free-form because tasks live
  -- in family_quests.tasks JSONB.
  task_key        text,
  -- Author of the moment. Hard-coupled to a member; if the member is
  -- removed, we cascade-clean the memory (privacy guardrail — no
  -- orphan photos floating in a family album).
  member_id       uuid        not null references public.family_members(id) on delete cascade,
  -- Denormalised for cheap timeline rendering.
  member_name     text        not null,
  member_avatar   text        not null,
  -- Storage path within the `family-photos` bucket. We do not store
  -- absolute URLs — the client calls .getPublicUrl()/.createSignedUrl()
  -- as needed.
  photo_path      text        not null,
  -- Optional thumbnail; same bucket, parallel filename. NULL until a
  -- worker (Edge Function or client) generates a small variant.
  thumb_path      text,
  caption         text,
  -- Optional pinned location label (free text, no GPS — child safety).
  place_label     text,
  -- When the moment happened in real life — defaults to upload time
  -- but the caller can override (e.g. "I'm uploading yesterday's
  -- picture I forgot about").
  captured_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index family_moments_family_id_created_at_idx
  on public.family_moments(family_id, created_at desc);

create index family_moments_family_id_quest_id_idx
  on public.family_moments(family_id, quest_id)
  where quest_id is not null;

create index family_moments_member_id_idx
  on public.family_moments(member_id);

-- ────────────────────────── activity kinds ──────────────────────────
-- Extend the CHECK constraint to allow the new Phase 3 event kinds.
-- We DROP + recreate because Postgres can't ALTER a CHECK in place.

alter table public.family_activities
  drop constraint if exists family_activities_kind_check;

alter table public.family_activities
  add constraint family_activities_kind_check
  check (kind in (
    'family_created',
    'member_joined',
    'task_completed',
    'quest_completed',
    'reward_unlocked',
    'moment_captured',          -- Phase 3
    'journal_entry_created'     -- Phase 3 (standalone, no quest)
  ));

-- ────────────────────────── realtime publication ──────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'family_moments'
  ) then
    alter publication supabase_realtime add table public.family_moments;
  end if;
end $$;

-- ────────────────────────── RLS (demo) ──────────────────────────

alter table public.family_moments enable row level security;

create policy "demo: rw moments"
  on public.family_moments
  for all using (true) with check (true);

-- ────────────────────────── family_memory_scores VIEW ──────────────────────────
-- Score formula:
--   quests_completed * 100
-- + photos_uploaded  *  10
-- + journal_entries  *  15
-- + active_days_30d  *   5

create or replace view public.family_memory_scores as
with
  q as (
    select family_id, count(*)::int as quests_completed
      from public.family_quests
     where status = 'completed'
     group by family_id
  ),
  p as (
    select family_id, count(*)::int as photos_uploaded
      from public.family_moments
     group by family_id
  ),
  j as (
    select family_id, count(*)::int as journal_entries
      from public.family_activities
     where kind in ('moment_captured', 'journal_entry_created')
     group by family_id
  ),
  a as (
    select family_id,
           count(distinct date_trunc('day', captured_at))::int as active_days_30d
      from public.family_moments
     where captured_at >= now() - interval '30 days'
     group by family_id
  )
select
  f.id as family_id,
  coalesce(q.quests_completed, 0)  as quests_completed,
  coalesce(p.photos_uploaded,  0)  as photos_uploaded,
  coalesce(j.journal_entries,  0)  as journal_entries,
  coalesce(a.active_days_30d,  0)  as active_days_30d,
  ( coalesce(q.quests_completed, 0) * 100
  + coalesce(p.photos_uploaded,  0) *  10
  + coalesce(j.journal_entries,  0) *  15
  + coalesce(a.active_days_30d,  0) *   5
  )::int as score
from public.families f
left join q on q.family_id = f.id
left join p on p.family_id = f.id
left join j on j.family_id = f.id
left join a on a.family_id = f.id;

-- ────────────────────────── helper RPC ──────────────────────────
-- Single-call moment creation: insert moment + matching activity in
-- one transaction so the timeline and feed never desync.

create or replace function public.create_family_moment(
  p_family_id     uuid,
  p_member_id     uuid,
  p_photo_path    text,
  p_caption       text default null,
  p_quest_id      uuid default null,
  p_task_key      text default null,
  p_place_label   text default null,
  p_captured_at   timestamptz default now()
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_member     record;
  v_moment_id  uuid;
  v_quest      record;
  v_kind       text;
  v_message    text;
begin
  select * into v_member from public.family_members where id = p_member_id;
  if v_member.id is null then raise exception 'member_not_found'; end if;
  if v_member.family_id <> p_family_id then raise exception 'member_not_in_family'; end if;

  insert into public.family_moments (
    family_id, quest_id, task_key, member_id,
    member_name, member_avatar,
    photo_path, caption, place_label, captured_at
  ) values (
    p_family_id, p_quest_id, p_task_key, p_member_id,
    v_member.display_name, v_member.avatar,
    p_photo_path, p_caption, p_place_label, p_captured_at
  )
  returning id into v_moment_id;

  if p_quest_id is null then
    v_kind := 'journal_entry_created';
    v_message := v_member.display_name || ' đã thêm một kỷ niệm vào nhật ký ❤️';
  else
    select * into v_quest from public.family_quests where id = p_quest_id;
    v_kind := 'moment_captured';
    v_message := v_member.display_name
              || ' vừa ghi lại một khoảnh khắc cho "'
              || coalesce(v_quest.title, 'nhiệm vụ gia đình')
              || '" 📸';
  end if;

  insert into public.family_activities (
    family_id, kind, actor_member_id, actor_name, actor_avatar, message, meta
  ) values (
    p_family_id, v_kind, p_member_id, v_member.display_name, v_member.avatar,
    v_message,
    jsonb_build_object(
      'momentId', v_moment_id,
      'questId', p_quest_id,
      'taskKey', p_task_key,
      'photoPath', p_photo_path
    )
  );

  return jsonb_build_object(
    'moment_id', v_moment_id,
    'kind', v_kind
  );
end $$;
