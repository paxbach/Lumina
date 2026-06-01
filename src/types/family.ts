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
