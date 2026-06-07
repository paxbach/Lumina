/**
 * Multiplayer MVP — Family domain types.
 *
 * Kept in their own module (not `src/types/index.ts`) so the existing
 * single-player types stay untouched. The store and components import
 * from here; nothing else in the app should depend on these types.
 */

export type MemberRole = 'parent' | 'child'

export interface Family {
  id: string
  familyName: string
  inviteCode: string         // e.g. LUMINA-AB12
  familyLevel: number        // bumps when shared quests complete
  familyStars: number        // shared currency
  createdAt: string          // ISO
}

export interface Member {
  id: string
  displayName: string
  avatar: string             // single emoji
  role: MemberRole
  joinedAt: string           // ISO
  lastSeenAt: string         // ISO — refreshed by presence pings
}

export interface QuestTask {
  key: string                // 'find-3-leaves'
  label: string
  emoji: string
  required: number
  /** Aggregate of all member contributions to this task. */
  progress: number
}

export interface SharedQuest {
  id: string
  templateKey: string        // 'nature-explorer'
  title: string
  description: string
  tasks: QuestTask[]
  status: 'active' | 'completed'
  startedAt: string
  completedAt: string | null
}

export type ActivityKind =
  | 'family_created'
  | 'member_joined'
  | 'task_completed'
  | 'quest_completed'
  | 'reward_unlocked'
  | 'moment_captured'        // Phase 3 — photo attached to a quest task
  | 'journal_entry_created'  // Phase 3 — standalone (no quest)

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  actorMemberId: string | null
  actorName: string | null
  actorAvatar: string | null
  /** Short, fully-rendered VN-locale message — denormalised for feed speed. */
  message: string
  meta?: Record<string, unknown>
  createdAt: string
}

/**
 * Per-tab presence payload broadcast on Supabase Realtime Presence.
 *
 * Carried inside `channel.track({...})` and reconstituted from the
 * `presenceState()` returned during 'sync' / 'join' / 'leave' events.
 * `memberId` is the canonical key — multiple tabs of the same member
 * can connect, but a single memberId = one online row in the UI.
 */
export interface OnlinePresence {
  memberId: string
  displayName: string
  avatar: string
  /** Optional UI route hint — used by future "Emma đang ở Bản đồ" UI. */
  page?: string
  /** ISO timestamp at last track() call. */
  lastSeen: string
}

/* ──────────────────────────────────────────────────────────────────────
   Phase 3 — Family Moments
   ────────────────────────────────────────────────────────────────────── */

/**
 * A single captured photo + caption + author. The Journal renders the
 * list newest-first; the Album groups by month + quest. Stored in
 * Postgres (`family_moments`) and synced via Supabase Realtime.
 */
export interface FamilyMoment {
  id: string
  familyId: string
  /** Null when the moment is a standalone "journal entry" not tied to a quest. */
  questId: string | null
  /** Free-form task key inside the quest's tasks JSONB. */
  taskKey: string | null
  memberId: string
  /** Denormalised for cheap timeline rendering. */
  memberName: string
  memberAvatar: string
  /** Storage path inside the `family-photos` bucket. */
  photoPath: string
  thumbPath: string | null
  caption: string | null
  placeLabel: string | null
  capturedAt: string
  createdAt: string
}

/** Family Memory Score — read from the `family_memory_scores` view. */
export interface MemoryScore {
  familyId: string
  questsCompleted: number
  photosUploaded: number
  journalEntries: number
  activeDays30d: number
  score: number
}

export type RewardKind = 'badge' | 'stars' | 'memory'

export interface SharedReward {
  id: string
  kind: RewardKind
  title: string
  emoji: string
  description: string
  questId: string | null
  createdAt: string
}
