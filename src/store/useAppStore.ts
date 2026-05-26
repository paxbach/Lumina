import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DiaryEntry,
  DiarySticker,
  KidProfile,
  Lesson,
  LumiState,
  Region,
} from '@/types'

/* ════════════════════════════════════════════════════════════════════
   Childhood Diary helpers
   ────────────────────────────────────────────────────────────────────
   Pure functions kept out of the store body so they can be unit-tested
   and so `saveMemory` reads top-to-bottom.
   ════════════════════════════════════════════════════════════════════ */

/** Compact, collision-resistant id with optional prefix. */
function makeId(prefix = 'mem'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Wait for an Image element to resolve a data-URL into pixels. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image-load-failed'))
    img.src = src
  })
}

/**
 * GUARDRAIL — strip EXIF / GPS / device metadata from an image data-URL.
 *
 * Browsers expose no API to edit metadata in-place; we instead re-encode
 * the pixels through a `<canvas>`. Canvas-encoded JPEGs only carry the
 * JFIF header + pixel data — EVERYTHING else (GPS coordinates, camera
 * model, software version, capture timestamp, thumbnail, etc.) is gone.
 *
 * As a bonus, we also downsample to `maxEdge` so a 4096×3072 phone
 * snapshot (~3 MB) doesn't blow out the 5 MB localStorage budget.
 *
 * SSR-safe: if no `document` is available, returns the input unchanged
 * — the caller will save raw bytes (acceptable in test/Node, never in
 * the actual browser flow).
 */
async function stripImageMetadata(
  dataUrl: string,
  maxEdge = 1280,
  quality = 0.86,
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl
  }
  if (!dataUrl.startsWith('data:')) {
    // Remote URL — nothing to strip locally. Caller should not pass these
    // through `saveMemory`, but we tolerate it.
    return dataUrl
  }

  try {
    const img = await loadImage(dataUrl)
    const w0 = img.naturalWidth || img.width
    const h0 = img.naturalHeight || img.height
    if (w0 === 0 || h0 === 0) return dataUrl

    const scale = Math.min(1, maxEdge / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl

    // White matte under transparent PNG sources so the JPEG re-encode
    // doesn't end up with black bands where alpha used to be.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    // If anything in the pipeline fails (unsupported format, OOM, CORS on a
    // blob-URL we didn't create, …) we return the original. The kid still
    // gets their memory; the next save attempt can re-try the strip.
    return dataUrl
  }
}

/* ════════════════════════════════════════════════════════════════════
   Pet Lumi — auto-revert timer
   ────────────────────────────────────────────────────────────────────
   `setLumiState` schedules a return to 'idle' after LUMI_REVERT_MS. We
   keep the timer at module scope so a fresh action call always cancels
   the previous one — without this the bath state could clobber a sleep
   the kid just initiated, etc. 'sleeping' opts out of auto-revert; it
   stays until the kid taps another action button.
   ════════════════════════════════════════════════════════════════════ */

// 5 s window — long enough for the per-action overlay (energy badge,
// heart rings, bath bubbles) to land its full beat before Lumi cross-
// fades back to the default BIOLUMINESCENT BODY mood. Sleeping opts
// out — it's a sustained state until the kid taps another action.
const LUMI_REVERT_MS = 5000
let lumiRevertTimer: ReturnType<typeof setTimeout> | null = null

function scheduleLumiRevert(reset: () => void) {
  if (lumiRevertTimer) {
    clearTimeout(lumiRevertTimer)
    lumiRevertTimer = null
  }
  // window may be unavailable during SSR or unit tests; skip silently.
  if (typeof window === 'undefined') return
  lumiRevertTimer = setTimeout(() => {
    lumiRevertTimer = null
    reset()
  }, LUMI_REVERT_MS)
}

/**
 * "Day N of the Lumina journey" — 1-indexed, computed at local midnight to
 * avoid timezone fence-post errors (a memory saved at 11:59 PM and another
 * at 12:01 AM the next day must land on Day N vs Day N+1).
 */
function computeDayInJourney(date: Date, journeyStart: Date): number {
  const startMidnight = new Date(
    journeyStart.getFullYear(),
    journeyStart.getMonth(),
    journeyStart.getDate(),
  ).getTime()
  const nowMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()
  const days = Math.floor((nowMidnight - startMidnight) / 86_400_000)
  return Math.max(1, days + 1)
}

interface AppState {
  profile: KidProfile
  lessons: Lesson[]
  regions: Region[]
  /**
   * Transient event marker — id of the region that *just* transitioned to
   * 'completed' on the previous `completeSubNode` call. The UI watches this
   * to show a celebration overlay, then calls `clearLastCompletedRegion` to
   * reset it. `null` when no celebration is pending.
   */
  lastCompletedRegion: string | null
  soundEnabled: boolean

  /** Consecutive-day learning streak. */
  streak: number
  /** "Tinh Thể Tri Thức" the kid has collected. */
  knowledgeCrystals: number
  /** Forest revival progress, 0..1. */
  forestRevival: number

  addStars: (n: number) => void
  addCrystals: (n: number) => void
  setForestRevival: (v: number) => void
  setLessonProgress: (id: string, progress: number) => void
  toggleSound: () => void

  /** Unlock a region (no-op if already unlocked or completed). */
  unlockRegion: (regionId: string) => void
  /**
   * Mark a sub-node as completed. If every sub-node in the region is then
   * completed, the region's status is automatically promoted to 'completed'
   * and `lastCompletedRegion` is set to that region's id so the UI can show
   * a celebration overlay.
   */
  completeSubNode: (regionId: string, nodeId: string) => void

  /** Dismiss the post-completion celebration overlay. */
  clearLastCompletedRegion: () => void

  /**
   * Wipe every piece of progress and snap the store back to the
   * fresh-install defaults: empty diary, all regions back to their
   * v10 defaults (Rừng Kỳ Diệu sensor games un-completed, etc.),
   * Lumi back to idle. Used by the "Reset toàn bộ tiến trình" button
   * in ProfilePage behind a confirmation modal.
   */
  resetAll: () => void

  /* ─── Childhood Diary ────────────────────────────────────────── */

  /** Immutable timeline of rich memory entries (newest first). */
  diaryEntries: DiaryEntry[]
  /**
   * ISO timestamp captured the first time the app initialised on this
   * device. Anchors the "Day N of the Lumina journey" counter on every
   * diary entry. Lazily set on first `saveMemory()` call if missing.
   */
  journeyStartedAt: string

  /**
   * Push a new diary entry. ASYNC because the image is re-encoded through
   * a `<canvas>` to strip EXIF / GPS / camera metadata before persistence
   * — a child-safety guardrail. The returned entry carries the auto-
   * computed `dayInJourney` so callers can show "Ngày thứ X" feedback.
   */
  saveMemory: (input: SaveMemoryInput) => Promise<DiaryEntry>
  /**
   * Remove a diary entry. No-op if the id doesn't exist. Should only be
   * called behind a parent-confirmation dialog — the action itself is
   * intentionally dumb so the guardrail lives in the UI where the wording
   * can be tuned without touching state.
   */
  deleteDiaryEntry: (id: string) => void

  /* ─── Pet Lumi (Bioluminescent Constellation Companion) ───────── */

  /** Current emotional / activity state — drives glow + decorations. */
  lumiState: LumiState
  /** "Năng lượng" — boosted by feeding (0..100). */
  lumiEnergy: number
  /** "Hạnh phúc" — boosted by petting (0..100). */
  lumiHappiness: number
  /** "Sạch sẽ" — boosted by bathing (0..100). */
  lumiCleanliness: number
  /** "Tinh hoa Stardust" — regenerated by sleeping. */
  lumiStardust: number

  /**
   * Set Lumi's state. Auto-reverts to 'idle' after 3 s for the action
   * states (feeding / petting / bathing); 'sleeping' stays put until
   * another action is invoked. Passing 'idle' explicitly cancels any
   * pending auto-revert.
   */
  setLumiState: (state: LumiState) => void
  /** Add to Energy stat (clamped 0..100). */
  addLumiEnergy: (n: number) => void
  /** Add to Happiness stat (clamped 0..100). */
  addLumiHappiness: (n: number) => void
  /** Add to Cleanliness stat (clamped 0..100). */
  addLumiCleanliness: (n: number) => void
  /** Add to Stardust currency (clamped non-negative, no upper cap). */
  addLumiStardust: (n: number) => void
}

/** Clamp helper for the 0..100 stat triad. */
function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

/** Caller-supplied fields for `saveMemory()`. The store fills in id,
 *  date, displayDate, dayInJourney and re-encodes the image. */
export interface SaveMemoryInput {
  /** Base64 data-URL. Will be re-encoded to strip EXIF/GPS. */
  imagePath: string
  questTitle: string
  parentNote?: string
  regionId: string
  stickers?: DiarySticker[]
}

const defaultProfile: KidProfile = {
  id: 'kid-1',
  name: 'Bé Bí',
  avatarEmoji: '🐻',
  stars: 0,
}

const defaultRegions: Region[] = [
  {
    id: 'rung-ky-dieu',
    name: 'Rừng Kỳ Diệu',
    status: 'unlocked',
    description:
      'Khu rừng đa giác quan của Lumi — nơi camera, cảm biến ánh sáng và các trò ghép hình cùng đánh thức từng cái cây, dòng thác và đốm sáng nhỏ trong rừng.',
    // Array order is preserved from the original v8 layout so the
    // RegionSubMapView's connector polyline draws exactly the same
    // path between nodes — only the text / route / emoji per
    // position changes. Coordinates ditto: each node keeps the
    // (x, y) % its predecessor occupied.
    //
    //   Position 1 → Cây Cổ Thụ Tri Thức   (was rkd-cay-co-thu)
    //   Position 2 → Thác Nước Màu         (was rkd-thac-nuoc-mau)
    //   Position 3 → Hang Đom Đóm          (was rkd-hang-dom-dom)
    //   Position 4 → Cứu Ngọn Lửa Bé Nhỏ   (was rkd-red-leaf)
    //   Position 5 → Ghép Lá Rừng          (was rkd-leaf-match)
    //
    // All five route into a region-specific `/game/forest/*` family
    // via `routePath`, so the generic type-based router doesn't need
    // a new node type for this batch.
    subNodes: [
      {
        id: 'rkd-forest-leaf-scanner',
        label: 'Cây Cổ Thụ Tri Thức',
        type: 'minigame',
        targetId: 'leaf-scanner',
        routePath: '/game/forest/leaf-scanner',
        emoji: '🌳',
        description:
          'Bé hãy dùng Magic Camera chụp một chiếc lá cây thật ngoài đời để nạp năng lượng sinh mệnh cho Cây Cổ Thụ lớn lên và mở khóa chữ cái bí ẩn nhé!',
        coordinates: { x: 22, y: 28 },
        isCompleted: false,
      },
      {
        id: 'rkd-forest-color-picker',
        label: 'Thác Nước Màu',
        type: 'minigame',
        targetId: 'color-picker',
        routePath: '/game/forest/color-picker',
        emoji: '🌈',
        description:
          'Thác nước bị mất màu rồi! Bé hãy dùng camera quét một đồ vật bất kỳ có Màu Đỏ hoặc Màu Vàng trong phòng để tô điểm lại cho dòng thác nhé.',
        coordinates: { x: 78, y: 24 },
        isCompleted: false,
      },
      {
        id: 'rkd-forest-light-detector',
        label: 'Hang Đom Đóm',
        type: 'minigame',
        targetId: 'light-detector',
        routePath: '/game/forest/light-detector',
        emoji: '✨',
        description:
          'Bé hãy tìm một góc phòng tối hoặc lấy tay che nhẹ camera để gọi các bạn đom đóm bay ra và cùng đếm xem có bao nhiêu đốm sáng kỳ diệu xuất hiện!',
        coordinates: { x: 80, y: 76 },
        isCompleted: false,
      },
      {
        // Centre node — repositioned narratively as the "Thám Hiểm
        // Safari" zoo photo mission. Coordinates and id are unchanged
        // so the connector polyline + persisted completion state both
        // stay intact across the v11 migration.
        id: 'rkd-forest-zoo-safari',
        label: 'THÁM HIỂM SAFARI',
        type: 'minigame',
        targetId: 'lion',
        routePath: '/photo-quests/zoo/lion',
        // iconKey resolves to the LionSafariIcon SVG in
        // src/components/map/CustomNodeIcons.tsx — the lion-head badge
        // with the camera-aperture overlay. The `emoji` is kept as a
        // graceful fallback if the registry lookup ever misses.
        iconKey: 'lion-safari',
        emoji: '🦁',
        description:
          'Lumi muốn khám phá thế giới động vật hoang dã ngoài đời thật! Nhiệm vụ của bé: hãy ghé thăm sở thú hoặc tìm một bức tranh / tượng của một con vật lớn (Sư tử, Voi, hoặc Khỉ) và chụp một bức ảnh thật đẹp để nhận thẻ kỷ niệm.',
        coordinates: { x: 50, y: 50 },
        isCompleted: false,
      },
      {
        id: 'rkd-forest-shape-match',
        label: 'Ghép Lá Rừng',
        type: 'minigame',
        targetId: 'shape-match',
        routePath: '/game/forest/shape-match',
        emoji: '🍃',
        description:
          'Một trò chơi tư duy! Bé hãy kéo thả các mảnh lá bài vào đúng khuôn hình gân lá (Tròn, Tam giác, Vuông) để khôi phục thảm thực vật của rừng.',
        coordinates: { x: 24, y: 78 },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'thanh-pho-thong-minh',
    name: 'Thành Phố Thông Minh',
    status: 'unlocked',
    description:
      'Nơi các khối rubik và bánh răng logic bị mất năng lượng, khiến thành phố mất điện. Cùng bé thắp sáng lại đèn đường, biển báo và những phép tính đầu đời.',
    subNodes: [
      {
        id: 'tptm-dem-toa-nha',
        label: 'Đếm Toà Nhà',
        type: 'lesson',
        targetId: 'numbers',
        emoji: '🏢',
        description: 'Tập đếm số tầng và ô cửa sổ trên các toà nhà.',
        coordinates: { x: 26, y: 30 },
        isCompleted: false,
      },
      {
        id: 'tptm-tim-duong',
        label: 'Tìm Đường Về Nhà',
        type: 'quest',
        targetId: 'find-way-home',
        emoji: '🚸',
        description:
          'Nhận diện biển báo giao thông và nhớ số điện thoại của ba mẹ.',
        coordinates: { x: 55, y: 48 },
        isCompleted: false,
      },
      {
        id: 'tptm-color-mix',
        label: 'Vòng Quay Săn Màu',
        type: 'minigame',
        targetId: 'color-hunter',
        emoji: '🎡',
        description:
          'Quay vòng chọn màu, cả nhà cùng tìm vật cùng màu rồi chụp lại để thắp lại đèn đường.',
        coordinates: { x: 76, y: 72 },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'dao-van-hoa',
    name: 'Đảo Văn Hoá',
    status: 'unlocked',
    description:
      'Hòn đảo lưu giữ những trang sử và phong tục Việt Nam, đang bị sương mù che phủ xoá nhoà ký ức. Cùng bé khôi phục ánh sáng của Tết, Trung Thu và những điệu múa cổ.',
    subNodes: [
      {
        id: 'dvh-le-hoi',
        label: 'Lễ Hội Ánh Sáng',
        type: 'quest',
        targetId: 'festival-ingredient',
        emoji: '🏮',
        description: 'Chuẩn bị mâm cỗ Trung Thu cùng mẹ và chú Cuội.',
        coordinates: { x: 30, y: 32 },
        isCompleted: false,
      },
      {
        id: 'dvh-sac-mau-tet',
        label: 'Sắc Màu Ngày Tết',
        type: 'lesson',
        targetId: 'colors',
        emoji: '🌸',
        description: 'Hoa mai, hoa đào và những bao lì xì may mắn.',
        coordinates: { x: 70, y: 30 },
        isCompleted: false,
      },
      {
        id: 'dvh-vu-dieu',
        label: 'Ghép Lại Kỷ Niệm',
        type: 'minigame',
        targetId: 'memory-puzzle',
        emoji: '🧩',
        description:
          'Ba mẹ chọn một ảnh gia đình, bé ghép lại để khôi phục ký ức của Đảo.',
        coordinates: { x: 50, y: 72 },
        isCompleted: false,
      },
      {
        // New v12 sub-node — Hành Trình Ngược Dòng Thời Gian.
        // `routePath` bypasses the type-based default router so the
        // tap lands directly on the custom detail page at
        // `/cultural-island/vietnam-history`. Type stays `minigame`
        // (the closest existing tone) so the SubNodeMarker picks up
        // the sage ring; the emoji is the Đông Sơn bronze drum so it
        // reads as historical without needing a custom icon.
        id: 'dvh-lich-su',
        label: 'Hành Trình Lịch Sử',
        type: 'minigame',
        targetId: 'vietnam-history',
        routePath: '/cultural-island/vietnam-history',
        emoji: '🥁',
        description:
          'Cùng Lumi ngược dòng thời gian — giải mã câu đố lịch sử và dã ngoại bảo tàng để tìm lại báu vật ngàn năm.',
        // Bottom-left of the sub-map canvas, balancing the existing
        // triangle (30,32) / (70,30) / (50,72) into a 4-point layout.
        coordinates: { x: 18, y: 58 },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'nui-khoa-hoc',
    name: 'Núi Khoa Học',
    status: 'unlocked',
    description:
      'Ngọn núi của các nhà bác học tí hon, nơi trọng lực và các định luật vật lý đang bị đảo lộn. Cùng bé làm thí nghiệm vui để mọi thứ về đúng vị trí.',
    subNodes: [
      {
        id: 'nkh-hinh-khoi-khong-gian',
        label: 'Hình Khối Không Gian',
        type: 'lesson',
        targetId: 'shapes',
        emoji: '🔷',
        description:
          'Nhận diện các vật dụng hình tròn, hình lập phương trong phòng.',
        coordinates: { x: 28, y: 36 },
        isCompleted: false,
      },
      {
        id: 'nkh-vu-tru',
        label: 'Hành Trình Sao Băng',
        type: 'quest',
        targetId: 'star-journey',
        emoji: '🌠',
        description:
          'Thí nghiệm "Vật nổi hay chìm?" với chậu nước và đồ trong bếp.',
        coordinates: { x: 64, y: 28 },
        isCompleted: false,
      },
      {
        id: 'nkh-color-mix',
        label: 'Pha Ánh Sáng Vũ Trụ',
        type: 'minigame',
        targetId: 'color-mix',
        emoji: '🔭',
        description: 'Trộn các tia laser để kích hoạt kính viễn vọng.',
        coordinates: { x: 50, y: 74 },
        isCompleted: false,
      },
    ],
  },
  {
    id: 'vuong-quoc-gia-dinh',
    name: 'Vương Quốc Gia Đình',
    status: 'unlocked',
    description:
      'Trái tim của thế giới Lumina, nơi lưu giữ những chiếc ôm và nụ cười ấm áp nhất của cả nhà.',
    subNodes: [
      {
        id: 'vqgd-bua-com',
        label: 'Bữa Cơm Của Mẹ',
        type: 'lesson',
        targetId: 'animals',
        emoji: '🍲',
        description:
          'Món ăn dinh dưỡng và tên các bạn thú cưng trong nhà.',
        coordinates: { x: 30, y: 38 },
        isCompleted: false,
      },
      {
        id: 'vqgd-cau-chuyen',
        label: 'Câu Chuyện Trước Khi Ngủ',
        type: 'quest',
        targetId: 'bedtime-story',
        emoji: '🌙',
        description:
          'Ôm chúc ngủ ngon ba mẹ và hỏi ông bà một kỷ niệm xưa.',
        coordinates: { x: 64, y: 34 },
        isCompleted: false,
      },
      {
        id: 'vqgd-cung-choi',
        label: 'Siêu Đầu Bếp Nhí',
        type: 'minigame',
        targetId: 'family-chef',
        emoji: '🍳',
        description:
          'Cả nhà cùng nấu Món Salad Tri Thức theo 3 bước, kết thúc bằng ảnh chụp.',
        coordinates: { x: 50, y: 74 },
        isCompleted: false,
      },
    ],
  },
]

const defaultLessons: Lesson[] = [
  {
    id: 'colors',
    title: 'Sắc màu',
    description: 'Khám phá thế giới đầy màu sắc',
    emoji: '🎨',
    tone: 'peach',
    progress: 0.3,
  },
  {
    id: 'numbers',
    title: 'Đếm số',
    description: 'Học đếm từ 1 đến 10',
    emoji: '🔢',
    tone: 'mint',
    progress: 0.6,
  },
  {
    id: 'animals',
    title: 'Bạn thú',
    description: 'Gặp gỡ các bạn động vật',
    emoji: '🦊',
    tone: 'butter',
    progress: 0.1,
  },
  {
    id: 'shapes',
    title: 'Hình khối',
    description: 'Nhận biết tròn, vuông, tam giác',
    emoji: '🔷',
    tone: 'lavender',
    progress: 0,
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      lessons: defaultLessons,
      regions: defaultRegions,
      lastCompletedRegion: null,
      soundEnabled: true,

      streak: 5,
      knowledgeCrystals: 24,
      forestRevival: 0.42,

      // Childhood Diary — empty at install; first save lazily sets
      // journeyStartedAt below.
      diaryEntries: [],
      journeyStartedAt: new Date().toISOString(),

      // Pet Lumi — defaults tuned for a kid opening the app for the
      // first time: friendly mid-range stats and idle bioluminescence.
      lumiState: 'idle',
      lumiEnergy: 60,
      lumiHappiness: 70,
      lumiCleanliness: 55,
      lumiStardust: 8,

      addStars: (n) =>
        set((s) => ({
          profile: { ...s.profile, stars: s.profile.stars + n },
        })),

      addCrystals: (n) =>
        set((s) => ({ knowledgeCrystals: Math.max(0, s.knowledgeCrystals + n) })),

      setForestRevival: (v) =>
        set(() => ({ forestRevival: Math.max(0, Math.min(1, v)) })),

      setLessonProgress: (id, progress) =>
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.id === id ? { ...l, progress: Math.max(0, Math.min(1, progress)) } : l,
          ),
        })),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      unlockRegion: (regionId) =>
        set((s) => ({
          regions: s.regions.map((r) =>
            r.id === regionId && r.status === 'locked'
              ? { ...r, status: 'unlocked' }
              : r,
          ),
        })),

      completeSubNode: (regionId, nodeId) =>
        set((s) => {
          let justMastered: string | null = null
          const regions = s.regions.map((r) => {
            if (r.id !== regionId) return r
            const wasCompleted = r.status === 'completed'
            const subNodes = r.subNodes.map((n) =>
              n.id === nodeId ? { ...n, isCompleted: true } : n,
            )
            const allDone =
              subNodes.length > 0 && subNodes.every((n) => n.isCompleted)
            if (allDone && !wasCompleted) {
              justMastered = regionId
            }
            return {
              ...r,
              subNodes,
              status: allDone ? ('completed' as const) : r.status,
            }
          })
          return {
            regions,
            ...(justMastered ? { lastCompletedRegion: justMastered } : null),
          }
        }),

      clearLastCompletedRegion: () => set({ lastCompletedRegion: null }),

      /* ─── Hard reset ─────────────────────────────────────────────
         Mirrors the initializer just above. KEEP THE TWO IN SYNC: if
         a new state field is added with a non-trivial default, append
         it here too — otherwise "Reset toàn bộ tiến trình" will leave
         the field at its pre-reset value (persist middleware writes
         only what `set()` touched).
         ───────────────────────────────────────────────────────────── */
      resetAll: () => {
        // Cancel any pending Lumi auto-revert so a freshly reset store
        // doesn't get clobbered ~3 s later by a stale timer firing.
        if (lumiRevertTimer) {
          clearTimeout(lumiRevertTimer)
          lumiRevertTimer = null
        }
        set({
          profile: defaultProfile,
          lessons: defaultLessons,
          regions: defaultRegions,
          lastCompletedRegion: null,
          soundEnabled: true,

          streak: 5,
          knowledgeCrystals: 24,
          forestRevival: 0.42,

          diaryEntries: [],
          journeyStartedAt: new Date().toISOString(),

          lumiState: 'idle',
          lumiEnergy: 60,
          lumiHappiness: 70,
          lumiCleanliness: 55,
          lumiStardust: 8,
        })
      },

      /* ─── Childhood Diary ──────────────────────────────────────
         Async because the EXIF/GPS guardrail re-encodes through a
         <canvas>. Caller awaits → gets the persisted entry back so
         the UI can confirm "Ngày thứ X" and surface the new id.
      ───────────────────────────────────────────────────────────── */
      saveMemory: async (input) => {
        // GUARDRAIL: scrub EXIF / GPS / device metadata before anything
        // touches state. If the strip fails (unsupported codec, OOM…) we
        // fall back to the raw bytes so the kid never loses their memory.
        const cleanedImage = await stripImageMetadata(input.imagePath)

        const now = new Date()
        // Lazy-init journey start the very first time a memory is saved on
        // a device whose persisted state pre-dates v6.
        const currentStart = get().journeyStartedAt
        const startISO = currentStart || now.toISOString()
        const startDate = new Date(startISO)

        const entry: DiaryEntry = {
          id: makeId('diary'),
          date: now.toISOString(),
          displayDate: now.toLocaleDateString('vi-VN'),
          dayInJourney: computeDayInJourney(now, startDate),
          imagePath: cleanedImage,
          questTitle: input.questTitle,
          parentNote: input.parentNote?.trim() || undefined,
          regionId: input.regionId,
          stickers: input.stickers ?? [],
        }

        set((s) => ({
          diaryEntries: [entry, ...s.diaryEntries],
          // Persist the lazy-init value so subsequent saves keep counting
          // from the same anchor.
          journeyStartedAt: s.journeyStartedAt || startISO,
        }))

        return entry
      },

      deleteDiaryEntry: (id) =>
        set((s) => ({
          diaryEntries: s.diaryEntries.filter((e) => e.id !== id),
        })),

      /* ─── Pet Lumi state machine ──────────────────────────────────
         Centralizes the auto-revert behaviour so any caller (action
         buttons, dev tools, future automations) gets the same lifecycle
         without re-implementing the revert timer (see LUMI_REVERT_MS).
      ───────────────────────────────────────────────────────────────── */
      setLumiState: (state) => {
        set({ lumiState: state })
        // 'sleeping' is a sustained mood — the kid wakes Lumi by tapping
        // another action. 'idle' is the target, no point re-scheduling.
        if (state === 'idle' || state === 'sleeping') {
          // Cancel any pending revert from a previous action.
          if (lumiRevertTimer) {
            clearTimeout(lumiRevertTimer)
            lumiRevertTimer = null
          }
          return
        }
        scheduleLumiRevert(() => set({ lumiState: 'idle' }))
      },

      addLumiEnergy: (n) =>
        set((s) => ({ lumiEnergy: clamp100(s.lumiEnergy + n) })),
      addLumiHappiness: (n) =>
        set((s) => ({ lumiHappiness: clamp100(s.lumiHappiness + n) })),
      addLumiCleanliness: (n) =>
        set((s) => ({ lumiCleanliness: clamp100(s.lumiCleanliness + n) })),
      addLumiStardust: (n) =>
        set((s) => ({ lumiStardust: Math.max(0, s.lumiStardust + n) })),
    }),
    // Default persist behavior serializes every state field (functions are
    // skipped automatically), so the kid's profile / diary / regions are
    // saved to localStorage under the `lumina-app-state` key and survive
    // reloads with no extra config.
    //
    // Version history:
    //   v3 — all 5 regions default 'unlocked' for MVP demo
    //   v4 — region lore + sub-node labels/emojis/descriptions overhaul
    //   v5 — 3 sub-nodes rewired to new mini-games
    //        (color-hunter / memory-puzzle / family-chef)
    //   v6 — Childhood Diary: seed empty `diaryEntries` + anchor
    //        `journeyStartedAt` for "Day N of Lumina journey"
    //   v7 — Pet Lumi: state machine ('idle' default) + 4 stat fields
    //        (energy / happiness / cleanliness / stardust)
    //   v8 — Family album consolidation: removed legacy `familyAlbum`
    //        array — the Scrapbook now reads `diaryEntries` directly
    //        (single source of truth for captured memories).
    //   v9 — Rừng Kỳ Diệu rethemed as "Sở Thú Jungle Wild" (ZOO ADVENTURE).
    //        All 5 sub-nodes replaced with photo-quest animal challenges;
    //        old leaf/colors/numbers IDs are dropped so persisted devices
    //        pick up the new content on first launch.
    //   v10 — Rừng Kỳ Diệu rewritten again into the multi-sensory forest
    //         (AI Leaf Scanner / Color Picker / Light Detector / Zoo
    //         Safari / Shape Match). Original SVG positions preserved
    //         from v8 — only labels / descriptions / emojis / route
    //         overrides change. v9 zoo IDs are wiped on migration.
    //   v11 — Centre node of Rừng Kỳ Diệu rethemed from "Cứu Ngọn Lửa Bé
    //         Nhỏ" → "THÁM HIỂM SAFARI". Targeted patch — only the
    //         safari node's label / description / targetId / routePath
    //         / iconKey change; other nodes (and their completion
    //         state) stay untouched.
    //   v12 — Đảo Văn Hoá gains a 4th sub-node `dvh-lich-su` (Hành
    //         Trình Ngược Dòng Thời Gian). Idempotent append — the
    //         migration ONLY pushes the node if it doesn't already
    //         exist, so existing region state + completion flags for
    //         the other 3 nodes survive the bump intact.
    //   v13 — Generic safety-net: for EVERY persisted region, append
    //         any default sub-node (by id) that's missing locally.
    //         Catches the case where a previous version bumped the
    //         persist version forward without the matching content
    //         migration actually running (HMR re-eval, half-loaded
    //         tab, etc.). Never removes nodes, so completion state +
    //         user content stay intact. Future content additions
    //         (new sub-nodes anywhere) automatically land via this
    //         block too without needing a fresh migration block.
    {
      name: 'lumina-app-state',
      version: 13,
      migrate: (persisted, fromVersion) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        const state = persisted as Partial<AppState> & {
          // Legacy field — `MemoryPhoto[]` until v7. We strip it on v8
          // upgrade so devices don't carry dead data forever.
          familyAlbum?: unknown
        }

        if (fromVersion < 3) {
          // Force every cached region into 'unlocked' so demos start with all
          // five lands explorable.
          if (Array.isArray(state.regions) && state.regions.length > 0) {
            state.regions = state.regions.map((r) =>
              r?.status === 'locked' ? { ...r, status: 'unlocked' } : r,
            )
          } else {
            state.regions = defaultRegions
          }
          state.lastCompletedRegion = null
        }

        if (fromVersion < 6) {
          // Childhood Diary was introduced in v6. Existing devices haven't
          // seen the schema, so seed an empty diary and anchor the journey
          // counter to today — Day 1 starts on the next saveMemory call.
          if (!Array.isArray(state.diaryEntries)) {
            state.diaryEntries = []
          }
          if (typeof state.journeyStartedAt !== 'string') {
            state.journeyStartedAt = new Date().toISOString()
          }
        }

        if (fromVersion < 7) {
          // Pet Lumi state machine introduced in v7. Force idle on
          // migration so a stale 'sleeping' from corrupted state can't
          // pin the night-mode background.
          state.lumiState = 'idle'
          if (typeof state.lumiEnergy !== 'number') state.lumiEnergy = 60
          if (typeof state.lumiHappiness !== 'number') state.lumiHappiness = 70
          if (typeof state.lumiCleanliness !== 'number') state.lumiCleanliness = 55
          if (typeof state.lumiStardust !== 'number') state.lumiStardust = 8
        }

        if (fromVersion < 4 || fromVersion < 5) {
          // v4 + v5 share the same shape — refresh regions wholesale to pick
          // up new labels / emojis / descriptions / mini-game routing while
          // preserving any completed sub-node by id match.
          const completedNodeIds = new Set<string>()
          if (Array.isArray(state.regions)) {
            for (const r of state.regions) {
              for (const n of r?.subNodes ?? []) {
                if (n?.isCompleted && typeof n.id === 'string') {
                  completedNodeIds.add(n.id)
                }
              }
            }
          }
          state.regions = defaultRegions.map((r) => {
            const subNodes = r.subNodes.map((n) => ({
              ...n,
              isCompleted: completedNodeIds.has(n.id),
            }))
            const allDone =
              subNodes.length > 0 && subNodes.every((n) => n.isCompleted)
            return {
              ...r,
              subNodes,
              status: allDone ? ('completed' as const) : r.status,
            }
          })
          state.lastCompletedRegion = null
        }

        if (fromVersion < 8) {
          // v8 — legacy `familyAlbum` removed in favour of `diaryEntries`.
          // Drop the field from persisted state so dev tools don't display
          // stale photos that the Scrapbook will never render again.
          if ('familyAlbum' in state) {
            delete state.familyAlbum
          }
        }

        if (fromVersion < 9) {
          // v9 — Rừng Kỳ Diệu becomes "Sở Thú Jungle Wild" with 5 brand
          // new photo-quest sub-nodes (rkd-zoo-*). The old leaf/colors/
          // numbers IDs no longer exist, so we simply overwrite that
          // region from defaults while leaving the other four regions'
          // completion state untouched.
          //
          // NOTE: v10 rewrites this region again (forest sensor-games),
          // so on a fresh v8→v10 jump this block effectively just hands
          // the v10 block below an up-to-date `defaultRegions` snapshot.
          const fresh = defaultRegions.find((r) => r.id === 'rung-ky-dieu')
          if (fresh && Array.isArray(state.regions)) {
            state.regions = state.regions.map((r) =>
              r?.id === 'rung-ky-dieu' ? { ...fresh } : r,
            )
          }
          // If the zoo region was the `lastCompletedRegion` under the old
          // schema, clear it — the celebration would otherwise point at a
          // region that no longer has the same nodes the kid finished.
          if (state.lastCompletedRegion === 'rung-ky-dieu') {
            state.lastCompletedRegion = null
          }
        }

        if (fromVersion < 10) {
          // v10 — Rừng Kỳ Diệu is replaced again, this time with the
          // multi-sensory forest games (rkd-forest-*). All v9 zoo IDs
          // (rkd-zoo-*) are wiped wholesale; positions and array order
          // are preserved from the original v8 layout so the connector
          // polyline draws identically.
          const fresh = defaultRegions.find((r) => r.id === 'rung-ky-dieu')
          if (fresh && Array.isArray(state.regions)) {
            state.regions = state.regions.map((r) =>
              r?.id === 'rung-ky-dieu' ? { ...fresh } : r,
            )
          }
          if (state.lastCompletedRegion === 'rung-ky-dieu') {
            state.lastCompletedRegion = null
          }
        }

        if (fromVersion < 11) {
          // v11 — Targeted patch of the centre node only. Spread the
          // fresh defaults for `rkd-forest-zoo-safari` over the
          // persisted node so the new label / description / targetId
          // / routePath / iconKey / emoji land, while preserving the
          // node's own `isCompleted` flag AND every other node in the
          // region (no wholesale overwrite this round).
          const freshNode = defaultRegions
            .find((r) => r.id === 'rung-ky-dieu')
            ?.subNodes.find((n) => n.id === 'rkd-forest-zoo-safari')
          if (freshNode && Array.isArray(state.regions)) {
            state.regions = state.regions.map((r) => {
              if (r?.id !== 'rung-ky-dieu') return r
              return {
                ...r,
                subNodes: r.subNodes.map((n) =>
                  n?.id === 'rkd-forest-zoo-safari'
                    ? { ...freshNode, isCompleted: !!n.isCompleted }
                    : n,
                ),
              }
            })
          }
        }

        if (fromVersion < 12) {
          // v12 — Append `dvh-lich-su` to `dao-van-hoa.subNodes` if it
          // isn't already there. Idempotent: re-running this migration
          // on already-patched state is a no-op. Other nodes + their
          // completion flags are not touched.
          const freshNode = defaultRegions
            .find((r) => r.id === 'dao-van-hoa')
            ?.subNodes.find((n) => n.id === 'dvh-lich-su')
          if (freshNode && Array.isArray(state.regions)) {
            state.regions = state.regions.map((r) => {
              if (r?.id !== 'dao-van-hoa') return r
              const exists = r.subNodes.some((n) => n?.id === 'dvh-lich-su')
              if (exists) return r
              return { ...r, subNodes: [...r.subNodes, freshNode] }
            })
          }
        }

        if (fromVersion < 13) {
          // v13 — Generic safety net. For every persisted region, walk
          // the matching `defaultRegions` entry and append any default
          // sub-node whose `id` is missing locally. This catches the
          // case where a previous version bump went out the door but
          // the corresponding content migration never actually fired
          // on a given device (Vite HMR keeping a stale persisted
          // version, a tab loaded mid-bump, etc.). Never removes nodes
          // so completion state + diary references survive.
          if (Array.isArray(state.regions)) {
            state.regions = state.regions.map((persistedRegion) => {
              const defaultRegion = defaultRegions.find(
                (r) => r.id === persistedRegion?.id,
              )
              if (!defaultRegion || !persistedRegion) return persistedRegion
              const persistedIds = new Set(
                persistedRegion.subNodes
                  .map((n) => n?.id)
                  .filter((id): id is string => typeof id === 'string'),
              )
              const missing = defaultRegion.subNodes.filter(
                (n) => !persistedIds.has(n.id),
              )
              if (missing.length === 0) return persistedRegion
              return {
                ...persistedRegion,
                subNodes: [...persistedRegion.subNodes, ...missing],
              }
            })
          }
        }

        return state as AppState
      },
    },
  ),
)
