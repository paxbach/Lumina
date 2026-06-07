import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActivityEntry,
  Family,
  FamilyMoment,
  Member,
  MemberRole,
  OnlinePresence,
  SharedQuest,
  SharedReward,
} from '@/types/family'
import { NATURE_EXPLORER_TEMPLATE } from '@/data/familyQuestTemplates'
import { supabase } from '@/lib/supabase'
import { stripImageMetadata } from '@/utils/imageStrip'
import { familyPhotoPath, uploadFamilyPhoto } from '@/lib/familyPhotos'

/* ════════════════════════════════════════════════════════════════════
   Family store — Supabase Realtime backed (Phase 2)
   ────────────────────────────────────────────────────────────────────
   Cross-device multiplayer: Mom-on-laptop and Emma-on-tablet land
   here, share a single Postgres row, and stay in sync via Supabase
   Realtime channels + RPC.

   Architecture:
     • Postgres (Supabase) is the source of truth.
     • This store is an in-memory **cache** of the family the user is
       currently in. Realtime subscriptions (see useFamilyRealtime)
       mutate the cache via the internal _setXxx / _appendXxx actions.
     • Persisted slice (localStorage) lets the dashboard render
       last-known data instantly while Realtime hydrates.
     • `currentMemberId` lives in sessionStorage so two tabs in the
       same browser can act as different members of the same family.
   ════════════════════════════════════════════════════════════════════ */

const SESSION_KEY_CURRENT_MEMBER = 'lumina:current-member-id'
const PRESENCE_FRESH_MS = 8_000
const MAX_ACTIVITIES = 60

/* ─── invite-code helper (client-side; the SQL unique constraint catches collisions) ── */

function generateInviteCode(): string {
  // Skip ambiguous chars (0/O, 1/I) so the code reads cleanly when read aloud.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `LUMINA-${suffix}`
}

/* ─── DB row → domain mappers ───────────────────────────────────────── */

interface FamilyRow {
  id: string
  family_name: string
  invite_code: string
  family_level: number
  family_stars: number
  created_at: string
}
interface MemberRow {
  id: string
  family_id: string
  display_name: string
  avatar: string
  role: MemberRole
  joined_at: string
  last_seen?: string                 // added in migration 0002
}
interface QuestRow {
  id: string
  family_id: string
  template_key: string
  title: string
  description: string
  tasks: SharedQuest['tasks']
  status: SharedQuest['status']
  started_at: string
  completed_at: string | null
}
interface ActivityRow {
  id: string
  family_id: string
  kind: ActivityEntry['kind']
  actor_member_id: string | null
  actor_name: string | null
  actor_avatar: string | null
  message: string
  meta: Record<string, unknown> | null
  created_at: string
}
interface RewardRow {
  id: string
  family_id: string
  quest_id: string | null
  kind: SharedReward['kind']
  title: string
  emoji: string
  description: string
  created_at: string
}
interface MomentRow {
  id: string
  family_id: string
  quest_id: string | null
  task_key: string | null
  member_id: string
  member_name: string
  member_avatar: string
  photo_path: string
  thumb_path: string | null
  caption: string | null
  place_label: string | null
  captured_at: string
  created_at: string
}

export const rowToFamily = (r: FamilyRow): Family => ({
  id: r.id,
  familyName: r.family_name,
  inviteCode: r.invite_code,
  familyLevel: r.family_level,
  familyStars: r.family_stars,
  createdAt: r.created_at,
})
export const rowToMember = (r: MemberRow): Member => ({
  id: r.id,
  displayName: r.display_name,
  avatar: r.avatar,
  role: r.role,
  joinedAt: r.joined_at,
  // last_seen (migration 0002) is stamped by useFamilyRealtime every
  // few seconds while a tab is open; powers durable "last active" UI
  // independent of the live channel-presence dot.
  lastSeenAt: r.last_seen ?? r.joined_at,
})
export const rowToQuest = (r: QuestRow): SharedQuest => ({
  id: r.id,
  templateKey: r.template_key,
  title: r.title,
  description: r.description,
  tasks: r.tasks,
  status: r.status,
  startedAt: r.started_at,
  completedAt: r.completed_at,
})
export const rowToActivity = (r: ActivityRow): ActivityEntry => ({
  id: r.id,
  kind: r.kind,
  actorMemberId: r.actor_member_id,
  actorName: r.actor_name,
  actorAvatar: r.actor_avatar,
  message: r.message,
  meta: r.meta ?? undefined,
  createdAt: r.created_at,
})
export const rowToReward = (r: RewardRow): SharedReward => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  emoji: r.emoji,
  description: r.description,
  questId: r.quest_id,
  createdAt: r.created_at,
})
export const rowToMoment = (r: MomentRow): FamilyMoment => ({
  id: r.id,
  familyId: r.family_id,
  questId: r.quest_id,
  taskKey: r.task_key,
  memberId: r.member_id,
  memberName: r.member_name,
  memberAvatar: r.member_avatar,
  photoPath: r.photo_path,
  thumbPath: r.thumb_path,
  caption: r.caption,
  placeLabel: r.place_label,
  capturedAt: r.captured_at,
  createdAt: r.created_at,
})

/* ─── State shape ───────────────────────────────────────────────────── */

interface FamilyState {
  family: Family | null
  members: Member[]
  quest: SharedQuest | null
  activities: ActivityEntry[]
  rewards: SharedReward[]
  /** Phase 3 — captured photo moments, newest-first. */
  moments: FamilyMoment[]
  /** Per-tab id of the member acting in this tab. From sessionStorage. */
  currentMemberId: string | null
  /**
   * memberId → live presence payload. Maintained by useFamilyRealtime
   * from Supabase `presence` sync / join / leave events. A key present
   * here = the member is currently online on at least one tab. Removal
   * is instant on 'leave' (no timestamp window needed).
   */
  presence: Record<string, OnlinePresence>
  /** Realtime channel state, surfaced for diagnostics / future UI. */
  status: 'idle' | 'connecting' | 'connected' | 'error'

  /* Public actions ────────────────────────────────── */

  createFamily: (input: {
    familyName: string
    founderName: string
    founderAvatar: string
    founderRole: MemberRole
  }) => Promise<{ family: Family; member: Member }>

  joinFamily: (input: {
    inviteCode: string
    displayName: string
    avatar: string
    role: MemberRole
  }) => Promise<{ ok: true; member: Member } | { ok: false; error: string }>

  contributeToTask: (taskKey: string) => Promise<void>

  /**
   * Phase 3 — primary action. Strip EXIF, upload to Storage, insert
   * the moment row via RPC. Returns `task_completed` / `quest_completed`
   * so the caller can fire celebration animations.
   */
  uploadMoment: (input: {
    file: Blob | File
    caption?: string
    memberId?: string         // defaults to currentMemberId
    questId?: string | null   // defaults to active quest id; pass `null` for standalone
    taskKey?: string | null
    placeLabel?: string
  }) => Promise<{
    momentId: string
    taskCompleted: boolean
    questCompleted: boolean
  }>

  leaveFamily: () => void

  /* Internal mutators (called by useFamilyRealtime) ──────────── */

  _setFamily: (f: Family | null) => void
  _setMembers: (members: Member[]) => void
  _appendMember: (m: Member) => void
  _setQuest: (q: SharedQuest | null) => void
  _setActivities: (a: ActivityEntry[]) => void
  _appendActivity: (a: ActivityEntry) => void
  _setRewards: (r: SharedReward[]) => void
  _appendReward: (r: SharedReward) => void
  _setMoments: (moments: FamilyMoment[]) => void
  _prependMoment: (m: FamilyMoment) => void
  /** Wholesale replace — called on `presence sync`. */
  _setPresence: (presence: Record<string, OnlinePresence>) => void
  /** Single-member insert — called on `presence join`. */
  _addOnlinePresence: (presence: OnlinePresence) => void
  /** Single-member remove — called on `presence leave`. */
  _removeOnlinePresence: (memberId: string) => void
  _setStatus: (s: FamilyState['status']) => void
}

/* ─── sessionStorage member-id helpers ──────────────────────────────── */

function loadCurrentMemberId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_KEY_CURRENT_MEMBER)
}
function saveCurrentMemberId(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) window.sessionStorage.setItem(SESSION_KEY_CURRENT_MEMBER, id)
  else window.sessionStorage.removeItem(SESSION_KEY_CURRENT_MEMBER)
}

/* ════════════════════════════════════════════════════════════════════ */

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      family: null,
      members: [],
      quest: null,
      activities: [],
      rewards: [],
      moments: [],
      currentMemberId: loadCurrentMemberId(),
      presence: {},
      status: 'idle',

      /* ─── createFamily ─────────────────────────────────────────── */
      createFamily: async ({ familyName, founderName, founderAvatar, founderRole }) => {
        const inviteCode = generateInviteCode()

        // 1. Insert family
        const { data: famRow, error: famErr } = await supabase
          .from('families')
          .insert({ family_name: familyName.trim(), invite_code: inviteCode })
          .select()
          .single<FamilyRow>()
        if (famErr || !famRow) {
          throw new Error(famErr?.message ?? 'Không tạo được gia đình.')
        }

        // 2. Insert founder member
        const { data: memRow, error: memErr } = await supabase
          .from('family_members')
          .insert({
            family_id: famRow.id,
            display_name: founderName.trim(),
            avatar: founderAvatar,
            role: founderRole,
          })
          .select()
          .single<MemberRow>()
        if (memErr || !memRow) {
          throw new Error(memErr?.message ?? 'Không tạo được thành viên.')
        }

        // 3. Seed the demo quest (Nature Explorer)
        const { data: questRow, error: questErr } = await supabase
          .from('family_quests')
          .insert({
            family_id: famRow.id,
            template_key: NATURE_EXPLORER_TEMPLATE.templateKey,
            title: NATURE_EXPLORER_TEMPLATE.title,
            description: NATURE_EXPLORER_TEMPLATE.description,
            tasks: NATURE_EXPLORER_TEMPLATE.tasks.map((t) => ({ ...t, progress: 0 })),
          })
          .select()
          .single<QuestRow>()
        if (questErr || !questRow) {
          throw new Error(questErr?.message ?? 'Không tạo được nhiệm vụ chung.')
        }

        // 4. Activity log (two entries — created + joined)
        await supabase.from('family_activities').insert([
          {
            family_id: famRow.id,
            kind: 'family_created',
            actor_member_id: memRow.id,
            actor_name: memRow.display_name,
            actor_avatar: memRow.avatar,
            message: `Gia đình ${memRow.display_name} đã tạo Phòng Gia Đình "${famRow.family_name}"`,
          },
          {
            family_id: famRow.id,
            kind: 'member_joined',
            actor_member_id: memRow.id,
            actor_name: memRow.display_name,
            actor_avatar: memRow.avatar,
            message: `Gia đình ${memRow.display_name} vừa tham gia hành trình`,
          },
        ])

        // 5. Seed local store synchronously so the UI renders instantly
        //    while Realtime catches up on the rest.
        const family = rowToFamily(famRow)
        const member = rowToMember(memRow)
        const quest = rowToQuest(questRow)
        saveCurrentMemberId(member.id)
        set({
          family,
          members: [member],
          quest,
          activities: [],
          rewards: [],
          currentMemberId: member.id,
          status: 'connecting',
        })
        return { family, member }
      },

      /* ─── joinFamily ───────────────────────────────────────────── */
      joinFamily: async ({ inviteCode, displayName, avatar, role }) => {
        const cleanName = displayName.trim()
        if (!cleanName) return { ok: false, error: 'Hãy nhập tên hiển thị của bạn.' }
        const code = inviteCode.trim().toUpperCase()
        if (!code) return { ok: false, error: 'Hãy nhập mã mời.' }

        // 1. Look up the family by invite code
        const { data: famRow, error: famErr } = await supabase
          .from('families')
          .select('*')
          .eq('invite_code', code)
          .maybeSingle<FamilyRow>()
        if (famErr) return { ok: false, error: 'Không kết nối được máy chủ. Hãy thử lại.' }
        if (!famRow) {
          return { ok: false, error: 'Mã mời không đúng. Hãy kiểm tra lại nhé!' }
        }

        // 2. Insert this tab as a new member
        const { data: memRow, error: memErr } = await supabase
          .from('family_members')
          .insert({
            family_id: famRow.id,
            display_name: cleanName,
            avatar,
            role,
          })
          .select()
          .single<MemberRow>()
        if (memErr || !memRow) {
          return { ok: false, error: memErr?.message ?? 'Không thể tham gia gia đình.' }
        }

        // 3. Log the join
        await supabase.from('family_activities').insert({
          family_id: famRow.id,
          kind: 'member_joined',
          actor_member_id: memRow.id,
          actor_name: memRow.display_name,
          actor_avatar: memRow.avatar,
          message: `${memRow.display_name} đã tham gia gia đình`,
        })

        // 4. Pull the rest of the family state in parallel so the
        //    dashboard renders immediately, before Realtime kicks in.
        const [membersRes, questRes, actsRes, rewardsRes] = await Promise.all([
          supabase
            .from('family_members')
            .select('*')
            .eq('family_id', famRow.id)
            .order('joined_at', { ascending: true })
            .returns<MemberRow[]>(),
          supabase
            .from('family_quests')
            .select('*')
            .eq('family_id', famRow.id)
            .eq('status', 'active')
            .limit(1)
            .returns<QuestRow[]>(),
          supabase
            .from('family_activities')
            .select('*')
            .eq('family_id', famRow.id)
            .order('created_at', { ascending: false })
            .limit(MAX_ACTIVITIES)
            .returns<ActivityRow[]>(),
          supabase
            .from('family_rewards')
            .select('*')
            .eq('family_id', famRow.id)
            .order('created_at', { ascending: false })
            .returns<RewardRow[]>(),
        ])

        const family = rowToFamily(famRow)
        const member = rowToMember(memRow)
        saveCurrentMemberId(member.id)
        set({
          family,
          members: (membersRes.data ?? []).map(rowToMember),
          quest: questRes.data?.[0] ? rowToQuest(questRes.data[0]) : null,
          activities: (actsRes.data ?? []).map(rowToActivity),
          rewards: (rewardsRes.data ?? []).map(rowToReward),
          currentMemberId: member.id,
          status: 'connecting',
        })
        return { ok: true, member }
      },

      /* ─── contributeToTask ─────────────────────────────────────── */
      contributeToTask: async (taskKey) => {
        const s = get()
        const me = s.members.find((m) => m.id === s.currentMemberId)
        if (!s.quest || !me) return
        if (s.quest.status !== 'active') return

        // The RPC handles: lock quest → bump task → log activity →
        // detect completion → insert rewards → bump family level.
        const { error } = await supabase.rpc('contribute_to_task', {
          p_quest_id: s.quest.id,
          p_task_key: taskKey,
          p_member_id: me.id,
          p_member_name: me.displayName,
          p_member_avatar: me.avatar,
        })
        if (error) {
          // eslint-disable-next-line no-console
          console.error('[lumina] contribute_to_task failed', error)
          return
        }
        // No optimistic patch — the Realtime subscription will deliver
        // the freshly inserted activity + updated quest within ~200ms.
      },

      /* ─── uploadMoment ──────────────────────────────────────────
         Phase 3 primary action. Wraps the full capture flow:
           1. Strip EXIF / GPS / device metadata in the browser
              (NEVER trust an unstripped photo to leave the device).
           2. Mint a moment id so the storage object + DB row share it.
           3. Upload to `family-photos` bucket.
           4. RPC `create_family_moment` — inserts the row, logs the
              activity, and atomically completes the quest if every
              task is now satisfied. Returns flags for celebration UI.
         ────────────────────────────────────────────────────────── */
      uploadMoment: async (input) => {
        const s = get()
        if (!s.family) throw new Error('no_family')
        const memberId = input.memberId ?? s.currentMemberId
        if (!memberId) throw new Error('no_member')
        const me = s.members.find((m) => m.id === memberId)
        if (!me) throw new Error('member_not_in_family')

        // Default quest link to the active family quest unless the
        // caller explicitly opts out (passes `questId: null`).
        const questId =
          input.questId === null
            ? null
            : (input.questId ?? s.quest?.id ?? null)
        const taskKey = input.taskKey ?? null

        // 1. EXIF strip → child-safety guardrail.
        const cleanedBlob = await stripImageMetadata(input.file)

        // 2. Generate id up-front so file path + DB row id match.
        const momentId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

        // 3. Upload to Storage.
        const photoPath = familyPhotoPath({
          familyId: s.family.id,
          momentId,
        })
        await uploadFamilyPhoto({
          familyId: s.family.id,
          momentId,
          file: cleanedBlob,
        })

        // 4. RPC — atomic moment + activity + quest completion check.
        const { data, error } = await supabase.rpc('create_family_moment', {
          p_id: momentId,
          p_family_id: s.family.id,
          p_member_id: me.id,
          p_photo_path: photoPath,
          p_caption: input.caption?.trim() || null,
          p_quest_id: questId,
          p_task_key: taskKey,
          p_place_label: input.placeLabel?.trim() || null,
        })
        if (error) throw new Error(error.message)

        const result = data as {
          moment_id: string
          kind: string
          task_completed: boolean
          quest_completed: boolean
        }

        return {
          momentId: result.moment_id,
          taskCompleted: !!result.task_completed,
          questCompleted: !!result.quest_completed,
        }
      },

      /* ─── leaveFamily (this tab only) ──────────────────────────── */
      leaveFamily: () => {
        saveCurrentMemberId(null)
        set({ currentMemberId: null })
      },

      /* ─── internal mutators ───────────────────────────────────── */

      _setFamily:    (f) => set({ family: f }),
      _setMembers:   (members) => set({ members }),
      _appendMember: (m) =>
        set((s) =>
          s.members.some((x) => x.id === m.id)
            ? s
            : { members: [...s.members, m] },
        ),
      _setQuest:     (q) => set({ quest: q }),
      _setActivities: (activities) => set({ activities: activities.slice(0, MAX_ACTIVITIES) }),
      _appendActivity: (a) =>
        set((s) =>
          s.activities.some((x) => x.id === a.id)
            ? s
            : { activities: [a, ...s.activities].slice(0, MAX_ACTIVITIES) },
        ),
      _setRewards:   (rewards) => set({ rewards }),
      _appendReward: (r) =>
        set((s) =>
          s.rewards.some((x) => x.id === r.id)
            ? s
            : { rewards: [r, ...s.rewards] },
        ),
      _setMoments: (moments) => set({ moments }),
      _prependMoment: (m) =>
        set((s) =>
          s.moments.some((x) => x.id === m.id)
            ? s
            : { moments: [m, ...s.moments] },
        ),
      _setPresence:  (presence) => set({ presence }),
      _addOnlinePresence: (p) =>
        set((s) =>
          s.presence[p.memberId] ? s : { presence: { ...s.presence, [p.memberId]: p } },
        ),
      _removeOnlinePresence: (memberId) =>
        set((s) => {
          if (!(memberId in s.presence)) return s
          const next = { ...s.presence }
          delete next[memberId]
          return { presence: next }
        }),
      _setStatus:    (status) => set({ status }),
    }),
    {
      // Persist a thin cache so the dashboard renders instantly on
      // reload while Realtime hydrates fresh data.
      name: 'lumina:family-state:v2',
      version: 2,
      partialize: (s) => ({
        family: s.family,
        members: s.members,
        quest: s.quest,
        activities: s.activities,
        rewards: s.rewards,
        moments: s.moments,
      }),
    },
  ),
)

/* ════════════════════════════════════════════════════════════════════
   Selectors — unchanged signatures so components import as before.
   ════════════════════════════════════════════════════════════════════ */

export function selectCurrentMember(s: FamilyState): Member | null {
  if (!s.currentMemberId) return null
  return s.members.find((m) => m.id === s.currentMemberId) ?? null
}

/**
 * Quest completion %, computed from the moments slice (Phase 3
 * source of truth — replaces the legacy `tasks[i].progress` counter).
 *
 * Returns a NUMBER, so React + Zustand v5's default Object.is check
 * is sufficient — no useShallow needed at the call site.
 *
 * NOTE: components that need the per-task moment LIST should compute
 * it inline with `useShallow` wrapping the selector (see SharedQuestCard).
 * A previously-exported `selectTaskMoments` returned a fresh array on
 * each call which caused an infinite render loop with the v5 store.
 */
export function selectQuestPercent(s: FamilyState): number {
  if (!s.quest) return 0
  const qid = s.quest.id
  const total = s.quest.tasks.reduce((sum, t) => sum + t.required, 0)
  if (total === 0) return 0
  const filled = s.quest.tasks.reduce((sum, t) => {
    const got = s.moments.reduce(
      (n, m) => (m.questId === qid && m.taskKey === t.key ? n + 1 : n),
      0,
    )
    return sum + Math.min(got, t.required)
  }, 0)
  return Math.round((filled / total) * 100)
}

export function selectMemberIsOnline(s: FamilyState, memberId: string): boolean {
  // The current tab's member is always online from its own perspective —
  // the WebSocket may briefly drop while track() is in flight, so we
  // never want to flicker our own dot.
  if (memberId === s.currentMemberId) return true
  // Event-driven: a memberId in `presence` means Realtime delivered a
  // 'join' (or 'sync' picked them up) and no 'leave' has fired yet.
  return memberId in s.presence
}

// Retained for backwards compatibility — no longer used since presence
// is now event-driven (join/leave) instead of timestamp-windowed.
export const PRESENCE_FRESH_WINDOW_MS = PRESENCE_FRESH_MS

/**
 * Alias for the Phase 2 spec which names the store `useFamilyRealtimeStore`.
 * The implementation is identical — Supabase is the canonical realtime
 * source already. New code may import either name.
 */
export const useFamilyRealtimeStore = useFamilyStore
