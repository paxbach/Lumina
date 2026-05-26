export type PastelTone =
  | 'peach'
  | 'mint'
  | 'butter'
  | 'lavender'
  | 'sky'

/**
 * Pet Lumi's current emotional / activity state.
 * Drives glow tint, body micro-animation and decoration overlays
 * (heart particles, bubble particles, constellation dots…).
 *
 *   - 'idle'     : default — soft warm bioluminescence + breathing
 *   - 'feeding'  : eating a star-candy; glow bursts golden
 *   - 'petting'  : tilting + emitting hearts; peach-pink glow
 *   - 'bathing'  : turquoise glow + bubble ripples
 *   - 'sleeping' : curled up + dimmed blue galaxy glow + constellation
 */
export type LumiState =
  | 'idle'
  | 'feeding'
  | 'petting'
  | 'bathing'
  | 'sleeping'

export interface Lesson {
  id: string
  title: string
  description: string
  emoji: string
  tone: PastelTone
  progress: number // 0..1
}

export interface KidProfile {
  id: string
  name: string
  avatarEmoji: string
  stars: number
}

/** A single interactive point on a region's sub-map. */
export interface SubNode {
  id: string
  label: string
  type: 'quest' | 'lesson' | 'minigame'
  /** ID of the underlying quest / lesson / minigame to launch. */
  targetId: string
  /** Position on the region's mini-map, in % of container width/height. */
  coordinates: { x: number; y: number }
  isCompleted: boolean
  /** Optional emoji that overrides the type-default on the sub-map marker. */
  emoji?: string
  /**
   * Optional registered React-icon key. When set, the sub-map marker
   * renders the matching custom SVG (see
   * `src/components/map/CustomNodeIcons.tsx`) instead of the emoji /
   * type-default — used for richer illustrated badges like the
   * "Thám Hiểm Safari" lion. Falls back to `emoji` if the key is not
   * registered, then to the type default.
   */
  iconKey?: string
  /** Optional short flavor text — feeds tooltips and detail views. */
  description?: string
  /**
   * Optional absolute route override. When set, the sub-map navigates
   * here directly instead of the type-based default (`/quests/:id`,
   * `/lessons/:id`, `/games/:id`). Use for region-specific game
   * families like `/game/forest/leaf-scanner` that don't fit the
   * generic route schema.
   */
  routePath?: string
}

export type RegionStatus = 'locked' | 'unlocked' | 'completed'

/** A top-level world area on the main map — owns a sub-map of nodes. */
export interface Region {
  id: string
  name: string
  status: RegionStatus
  description: string
  subNodes: SubNode[]
  /**
   * Optional themed eyebrow shown above the sub-map title (e.g.
   * "ZOO ADVENTURE"). When absent, the sub-map falls back to the generic
   * "Sub-map · {name}" label.
   */
  subMapEyebrow?: string
}

/** One photo saved into the family album after completing a real-world quest. */
export interface MemoryPhoto {
  id: string
  questId: string
  questTitle: string
  /** Base64 data-URL or remote image URL. */
  imageSrc: string
  /** Locale-formatted date string (vi-VN) at the moment the photo was saved. */
  timestamp: string
  regionId: string
}

/* ────────────────────────────────────────────────────────── */
/* Childhood Diary — richer memory entries with stickers,    */
/* parent notes and the "Day N of the Lumina journey" metric */
/* ────────────────────────────────────────────────────────── */

/**
 * A sticker as persisted in a diary entry. No `uid` field — the UI's
 * working sticker (`PlacedSticker` in DecorateMemoryScreen) carries a
 * runtime id for React keys, but storage only needs the visual data.
 */
export interface DiarySticker {
  /** Sticker identity ('lumi' | 'heart' | 'star' | …). */
  kind: string
  /** Position % of the photo container (0–100). */
  x: number
  y: number
  /** Rotation in degrees. */
  rotation: number
  /** Rendered size in px when the sticker was placed. */
  size: number
}

/**
 * One immutable entry in the Childhood Diary. Created exclusively via
 * `useAppStore.saveMemory()`, which:
 *   - re-encodes the image through a `<canvas>` to strip EXIF/GPS,
 *   - stamps `date` (ISO), `displayDate` (vi-VN), and the auto-computed
 *     `dayInJourney` against the persisted `journeyStartedAt`.
 */
export interface DiaryEntry {
  id: string
  /** ISO 8601 timestamp at save time. */
  date: string
  /** vi-VN locale display string (e.g. "15/05/2026"). */
  displayDate: string
  /** "Ngày thứ X trong hành trình Lumina" — 1-indexed. */
  dayInJourney: number
  /** Base64 data-URL. EXIF/GPS scrubbed before this is written. */
  imagePath: string
  questTitle: string
  parentNote?: string
  regionId: string
  stickers: DiarySticker[]
}
