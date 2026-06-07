-- ════════════════════════════════════════════════════════════════════
-- Lumina · Phase 3 (cont.) — Quest completion driven by moments
-- ────────────────────────────────────────────────────────────────────
-- Replaces the click-counter completion path with a photo-driven one:
-- whenever a moment is captured against a quest+task, the RPC
-- recomputes per-task completion (count of moments vs `required`) and,
-- if every task is satisfied, atomically marks the quest completed
-- and inserts the reward set.
--
-- Also flips the family-photos Storage bucket to PUBLIC for the demo
-- so getPublicUrl() works without a signing dance. Production should
-- revert this and use signed URLs scoped to family membership.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────── public bucket (demo) ──────────────────────────

update storage.buckets
   set public = true
 where id = 'family-photos';

-- ────────────────────────── create_family_moment v2 ──────────────────────────
-- Adds:
--   • optional p_id so the client can mint the moment id up-front and
--     use it as the photo file name (DB row + storage object share id).
--   • quest-completion check on every quest-linked moment: if every
--     task has `count(moments) >= required`, flip the quest, insert
--     rewards, bump family level/stars, log activities.
--
-- Returns:
--   { moment_id, kind, task_completed, quest_completed }
--   where task_completed indicates whether THIS moment was the one
--   that satisfied its task (for the celebration animation).

create or replace function public.create_family_moment(
  p_family_id     uuid,
  p_member_id     uuid,
  p_photo_path    text,
  p_caption       text          default null,
  p_quest_id      uuid          default null,
  p_task_key      text          default null,
  p_place_label   text          default null,
  p_captured_at   timestamptz   default now(),
  p_id            uuid          default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_member          record;
  v_moment_id       uuid;
  v_quest           record;
  v_kind            text;
  v_message         text;
  v_task            jsonb;
  v_task_required   int;
  v_task_count      int;
  v_task_completed  boolean := false;
  v_quest_completed boolean := false;
  v_all_done        boolean := true;
  v_now             timestamptz := now();
begin
  select * into v_member from public.family_members where id = p_member_id;
  if v_member.id is null then raise exception 'member_not_found'; end if;
  if v_member.family_id <> p_family_id then raise exception 'member_not_in_family'; end if;

  insert into public.family_moments (
    id, family_id, quest_id, task_key, member_id,
    member_name, member_avatar,
    photo_path, caption, place_label, captured_at
  ) values (
    coalesce(p_id, gen_random_uuid()),
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
      'momentId',  v_moment_id,
      'questId',   p_quest_id,
      'taskKey',   p_task_key,
      'photoPath', p_photo_path
    )
  );

  -- ─── quest-completion check ────────────────────────────────────
  if p_quest_id is not null and p_task_key is not null
     and v_quest.status = 'active' then

    -- Did THIS moment complete its task?
    select (t->>'required')::int into v_task_required
      from jsonb_array_elements(v_quest.tasks) t
     where t->>'key' = p_task_key
     limit 1;

    select count(*) into v_task_count
      from public.family_moments
     where quest_id = p_quest_id and task_key = p_task_key;

    v_task_completed := (v_task_required is not null
                         and v_task_count >= v_task_required
                         and v_task_count = v_task_required); -- crossed exactly now

    -- Are ALL tasks satisfied?
    for v_task in select t from jsonb_array_elements(v_quest.tasks) t loop
      select count(*) into v_task_count
        from public.family_moments
       where quest_id = p_quest_id
         and task_key = v_task->>'key';
      if v_task_count < (v_task->>'required')::int then
        v_all_done := false;
        exit;
      end if;
    end loop;

    if v_all_done then
      v_quest_completed := true;
      update public.family_quests
         set status = 'completed', completed_at = v_now
       where id = p_quest_id;

      insert into public.family_rewards (family_id, quest_id, kind, title, emoji, description) values
        (p_family_id, p_quest_id, 'badge',  'Huy hiệu ' || v_quest.title, '🏅',
         'Cả nhà đã hoàn thành ' || v_quest.title || ' bằng những khoảnh khắc thật!'),
        (p_family_id, p_quest_id, 'stars',  '+100 Sao Gia Đình', '⭐',
         'Quỹ sao chung tăng thêm 100.'),
        (p_family_id, p_quest_id, 'memory', 'Trang mới trong Album gia đình', '📷',
         'Tất cả ảnh từ nhiệm vụ này đã được dán vào album.');

      update public.families
         set family_level = family_level + 1,
             family_stars = family_stars + 100
       where id = p_family_id;

      insert into public.family_activities (
        family_id, kind, actor_member_id, actor_name, actor_avatar, message, meta
      ) values
        (p_family_id, 'quest_completed', p_member_id, v_member.display_name, v_member.avatar,
         'Cả nhà đã hoàn thành "' || v_quest.title || '" 🎉',
         jsonb_build_object('questId', p_quest_id)),
        (p_family_id, 'reward_unlocked', null, null, null,
         'Mở khóa: Huy hiệu ' || v_quest.title || ', +100 Sao Gia Đình, Trang mới trong Album',
         '{}'::jsonb);
    end if;
  end if;

  return jsonb_build_object(
    'moment_id',        v_moment_id,
    'kind',             v_kind,
    'task_completed',   v_task_completed,
    'quest_completed',  v_quest_completed
  );
end $$;
