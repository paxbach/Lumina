-- ════════════════════════════════════════════════════════════════════
-- Lumina · Family multiplayer (Supabase Realtime)
-- Run this once in Supabase SQL editor on a fresh project.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ────────────────────────── tables ──────────────────────────

create table public.families (
  id            uuid        primary key default gen_random_uuid(),
  family_name   text        not null check (char_length(family_name) between 1 and 32),
  invite_code   text        not null unique,
  family_level  int         not null default 1,
  family_stars  int         not null default 0,
  created_at    timestamptz not null default now()
);

create table public.family_members (
  id            uuid        primary key default gen_random_uuid(),
  family_id     uuid        not null references public.families(id) on delete cascade,
  display_name  text        not null,
  avatar        text        not null,
  role          text        not null check (role in ('parent','child')),
  joined_at     timestamptz not null default now()
);
create index on public.family_members(family_id);

create table public.family_quests (
  id            uuid        primary key default gen_random_uuid(),
  family_id     uuid        not null references public.families(id) on delete cascade,
  template_key  text        not null,
  title         text        not null,
  description   text        not null,
  tasks         jsonb       not null,
  status        text        not null default 'active' check (status in ('active','completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index on public.family_quests(family_id, status);

create table public.family_activities (
  id              uuid        primary key default gen_random_uuid(),
  family_id       uuid        not null references public.families(id) on delete cascade,
  kind            text        not null check (kind in (
                    'family_created','member_joined','task_completed',
                    'quest_completed','reward_unlocked'
                  )),
  actor_member_id uuid,
  actor_name      text,
  actor_avatar    text,
  message         text        not null,
  meta            jsonb,
  created_at      timestamptz not null default now()
);
create index on public.family_activities(family_id, created_at desc);

create table public.family_rewards (
  id            uuid        primary key default gen_random_uuid(),
  family_id     uuid        not null references public.families(id) on delete cascade,
  quest_id      uuid        references public.family_quests(id) on delete set null,
  kind          text        not null check (kind in ('badge','stars','memory')),
  title         text        not null,
  emoji         text        not null,
  description   text        not null,
  created_at    timestamptz not null default now()
);
create index on public.family_rewards(family_id, created_at desc);

-- ────────────────────────── realtime ──────────────────────────
-- Publish every table the client subscribes to.
alter publication supabase_realtime add table public.families;
alter publication supabase_realtime add table public.family_members;
alter publication supabase_realtime add table public.family_quests;
alter publication supabase_realtime add table public.family_activities;
alter publication supabase_realtime add table public.family_rewards;

-- ────────────────────────── RLS (demo policy) ──────────────────────────
-- Stakeholders' demo only — anonymous anon-key clients can rw any row.
-- HARDEN BEFORE PRODUCTION: scope by family_id membership via auth.uid().
alter table public.families         enable row level security;
alter table public.family_members   enable row level security;
alter table public.family_quests    enable row level security;
alter table public.family_activities enable row level security;
alter table public.family_rewards   enable row level security;

create policy "demo: rw families"    on public.families         for all using (true) with check (true);
create policy "demo: rw members"     on public.family_members   for all using (true) with check (true);
create policy "demo: rw quests"      on public.family_quests    for all using (true) with check (true);
create policy "demo: rw activities"  on public.family_activities for all using (true) with check (true);
create policy "demo: rw rewards"     on public.family_rewards   for all using (true) with check (true);

-- ────────────────────────── contribute_to_task RPC ──────────────────────────
-- Atomic: lock quest row → bump task progress → log activity →
-- on full completion, flip status / insert rewards / bump family.
-- Single roundtrip avoids the read-modify-write race when two members
-- click "+ Đóng góp" simultaneously.

create or replace function public.contribute_to_task(
  p_quest_id      uuid,
  p_task_key      text,
  p_member_id     uuid,
  p_member_name   text,
  p_member_avatar text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_quest         record;
  v_family_id     uuid;
  v_new_tasks     jsonb;
  v_task_label    text;
  v_task_progress int;
  v_task_required int;
  v_all_done      boolean;
  v_now           timestamptz := now();
begin
  select * into v_quest from public.family_quests where id = p_quest_id for update;
  if v_quest.id is null     then raise exception 'quest_not_found'; end if;
  if v_quest.status <> 'active' then raise exception 'quest_not_active'; end if;
  v_family_id := v_quest.family_id;

  -- Increment the matching task's `progress` (clamped at `required`).
  select jsonb_agg(
    case when t->>'key' = p_task_key then
      jsonb_set(
        t,
        '{progress}',
        to_jsonb(least(((t->>'required')::int), ((t->>'progress')::int) + 1))
      )
    else t end
  )
  into v_new_tasks
  from jsonb_array_elements(v_quest.tasks) t;

  select (t->>'label')::text, (t->>'progress')::int, (t->>'required')::int
    into v_task_label, v_task_progress, v_task_required
  from jsonb_array_elements(v_new_tasks) t
  where t->>'key' = p_task_key;

  update public.family_quests set tasks = v_new_tasks where id = p_quest_id;

  insert into public.family_activities (
    family_id, kind, actor_member_id, actor_name, actor_avatar, message, meta
  )
  values (
    v_family_id, 'task_completed', p_member_id, p_member_name, p_member_avatar,
    p_member_name || ' đã đóng góp: ' || v_task_label,
    jsonb_build_object(
      'taskKey',      p_task_key,
      'taskLabel',    v_task_label,
      'taskProgress', v_task_progress,
      'taskRequired', v_task_required
    )
  );

  select bool_and((t->>'progress')::int >= (t->>'required')::int)
    into v_all_done
  from jsonb_array_elements(v_new_tasks) t;

  if v_all_done then
    update public.family_quests
      set status = 'completed', completed_at = v_now
      where id = p_quest_id;

    insert into public.family_rewards (family_id, quest_id, kind, title, emoji, description) values
      (v_family_id, p_quest_id, 'badge',  'Huy hiệu Thám hiểm thiên nhiên', '🏅', 'Cả nhà đã hoàn thành nhiệm vụ chung đầu tiên!'),
      (v_family_id, p_quest_id, 'stars',  '+100 Sao Gia Đình',              '⭐', 'Quỹ sao chung tăng thêm 100.'),
      (v_family_id, p_quest_id, 'memory', 'Kỷ niệm: Một buổi chiều ngoài trời', '📷', 'Trang mới trong sổ kỷ niệm gia đình đã được mở.');

    update public.families
      set family_level = family_level + 1,
          family_stars = family_stars + 100
      where id = v_family_id;

    insert into public.family_activities (family_id, kind, actor_member_id, actor_name, actor_avatar, message, meta) values
      (v_family_id, 'quest_completed', p_member_id, p_member_name, p_member_avatar,
       'Cả nhà đã hoàn thành "' || v_quest.title || '" 🎉',
       jsonb_build_object('questId', p_quest_id)),
      (v_family_id, 'reward_unlocked', null, null, null,
       'Mở khóa: Huy hiệu Thám hiểm thiên nhiên, +100 Sao Gia Đình, Kỷ niệm: Một buổi chiều ngoài trời',
       '{}'::jsonb);
  end if;

  return jsonb_build_object('completed', v_all_done);
end $$;
