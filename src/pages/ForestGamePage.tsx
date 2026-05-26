import { useMemo, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { ColorPickerGame } from '@/components/games/ColorPickerGame'
import { FireflyLightGame } from '@/components/games/FireflyLightGame'
import { LeafScannerGame } from '@/components/games/LeafScannerGame'
import { LeafShapeMatchGame } from '@/components/games/LeafShapeMatchGame'
import { useAppStore } from '@/store/useAppStore'
import { springBouncy } from '@/utils/motion'

/**
 * Registry of built interactive games. Adding a new sensor / AI game
 * = register its component here + give it an entry in `CRYSTAL_REWARD`
 * if the reward badge differs from the default. Anything not in this
 * map renders the generic placeholder card below.
 */
const INTERACTIVE_GAMES: Record<
  string,
  ComponentType<{ onComplete?: () => void }>
> = {
  'leaf-scanner':    LeafScannerGame,
  'color-picker':    ColorPickerGame,
  'light-detector':  FireflyLightGame,
  'shape-match':     LeafShapeMatchGame,
}

/**
 * Per-game crystal reward. Defaults to 2 (placeholder games); real games
 * override so the in-game "+N Tinh thể Tri thức" badge matches what the
 * store actually grants.
 */
const CRYSTAL_REWARD: Record<string, number> = {
  'leaf-scanner':   1,
  'color-picker':   1,
  'light-detector': 1,
  'shape-match':    1,
}
const DEFAULT_REWARD = 2

/* ════════════════════════════════════════════════════════════════════
   Forest Game placeholder
   ────────────────────────────────────────────────────────────────────
   Catches every `/game/forest/:gameId` route emitted by Rừng Kỳ Diệu's
   sub-nodes. The real sensor / AI mini-games (Magic Camera leaf scan,
   color picker, ambient light detector, shape match, zoo safari) aren't
   built yet — this page surfaces the mission brief, lets the kid mark
   it complete, then sends them back to the sub-map so the prototype
   loop closes without falling through to NotFoundPage.
   ════════════════════════════════════════════════════════════════════ */

/**
 * Static per-game presentation. Sub-node label / description come from
 * the live store; this table only carries display chrome that doesn't
 * belong on the SubNode itself (mission eyebrow + accent gradient).
 *
 * Keys mirror the `targetId` field of each forest sub-node. The
 * legacy `zoo-safari` entry is intentionally absent — that gameId
 * gets bounced to `/photo-quests/zoo/lion` by the redirect below
 * before this lookup ever runs.
 */
const FOREST_GAME_META: Record<
  string,
  { mission: string; accent: string; ctaLabel: string }
> = {
  'leaf-scanner': {
    mission: 'Tìm Linh Hồn Lá Cây',
    accent: 'from-sage-200 via-sage-100 to-butter-100',
    ctaLabel: 'Mở Magic Camera',
  },
  'color-picker': {
    mission: 'Săn Tìm Sắc Màu Cầu Vồng',
    accent: 'from-peach-200 via-butter-100 to-sage-100',
    ctaLabel: 'Bắt đầu quét màu',
  },
  'light-detector': {
    mission: 'Thắp Sáng Bóng Đêm',
    accent: 'from-lavender-200 via-sky-100 to-cream-100',
    ctaLabel: 'Gọi đom đóm',
  },
  'shape-match': {
    mission: 'Hình Khối Thiên Nhiên',
    accent: 'from-sage-200 via-cream-100 to-lavender-100',
    ctaLabel: 'Vào trò ghép hình',
  },
}

const FALLBACK_META = {
  mission: 'Khám phá rừng kỳ diệu',
  accent: 'from-sage-100 via-cream-100 to-butter-100',
  ctaLabel: 'Bắt đầu nhiệm vụ',
}

export default function ForestGamePage() {
  const navigate = useNavigate()
  const { gameId = '' } = useParams<{ gameId: string }>()
  const [searchParams] = useSearchParams()
  const regionId = searchParams.get('region') ?? 'rung-ky-dieu'
  const nodeId = searchParams.get('node')

  const regions = useAppStore((s) => s.regions)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const addCrystals = useAppStore((s) => s.addCrystals)

  // Resolve the sub-node from the live store. Falls back to a match by
  // `targetId` (= the route param) when the `node` query string is
  // missing — that way the page still works if a kid deep-links a route
  // manually or share-links lose the params.
  const { region, node } = useMemo(() => {
    const r = regions.find((x) => x.id === regionId) ?? null
    if (!r) return { region: null, node: null }
    const n =
      (nodeId ? r.subNodes.find((s) => s.id === nodeId) : undefined) ??
      r.subNodes.find((s) => s.targetId === gameId) ??
      null
    return { region: r, node: n }
  }, [regions, regionId, nodeId, gameId])

  const meta = FOREST_GAME_META[gameId] ?? FALLBACK_META
  const alreadyDone = !!node?.isCompleted

  // ═══════════════════════════════════════════════════════════════════
  // Legacy redirect — the centre safari node moved out of the forest
  // game family in v11 to its own page at `/photo-quests/zoo/:animalId`.
  // Devices whose persisted state still carries the old routePath
  // (`/game/forest/zoo-safari`) — e.g. because the v11 migration was
  // interrupted by a hard reload or hasn't fired yet on a tab opened
  // before the bump — land here. We bounce them to the proper page
  // with `replace` so the browser back-history doesn't loop between
  // the two routes.
  //
  // Placed AFTER all hooks above so this early-return doesn't violate
  // Rules of Hooks. Anything below this guard belongs to the in-region
  // forest games only.
  // ═══════════════════════════════════════════════════════════════════
  if (gameId === 'zoo-safari') {
    const qs = new URLSearchParams()
    qs.set('region', regionId)
    if (nodeId) qs.set('node', nodeId)
    return <Navigate to={`/photo-quests/zoo/lion?${qs.toString()}`} replace />
  }

  // Always return to the originating sub-map (not the world view) so the
  // kid sees the node they just finished light up green right next to the
  // others. `WorldMapPage` reads `?region=` as the source of truth for
  // which sub-map is open, so this round-trip is lossless.
  const backToSubMap = () => {
    navigate(region ? `/map?region=${region.id}` : '/map')
  }

  const handleComplete = () => {
    if (!region || !node) {
      navigate('/map')
      return
    }
    if (!node.isCompleted) {
      addCrystals(CRYSTAL_REWARD[gameId] ?? DEFAULT_REWARD)
      completeSubNode(region.id, node.id)
    }
    backToSubMap()
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div className="flex items-center gap-3">
          <IconButton label="Quay lại" tone="cream" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </IconButton>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-500">
              Rừng Kỳ Diệu · Mini-game
            </p>
            <h1 className="text-xl font-display font-bold text-cocoa-900">
              {node?.label ?? 'Nhiệm vụ rừng'}
            </h1>
          </div>
        </div>
      }
    >
      {INTERACTIVE_GAMES[gameId] ? (
        <Card tone="cream" padding="lg">
          {/* Mission micro-header (eyebrow + label) so the kid still sees
              the "Nhiệm vụ: …" framing the placeholder gives — compressed
              since the interactive game itself takes over the card. */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sage-500">
                Nhiệm vụ: {meta.mission}
              </p>
              <p className="mt-0.5 font-display text-base font-bold text-cocoa-900">
                {node?.label ?? 'Khám phá Rừng Kỳ Diệu'}
              </p>
            </div>
            {alreadyDone && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-sage-300 bg-sage-100 px-2.5 py-0.5 text-[11px] font-bold text-sage-500 shadow-soft">
                <Check className="size-3.5" />
                Đã hoàn thành
              </span>
            )}
          </div>

          {(() => {
            const GameComponent = INTERACTIVE_GAMES[gameId]
            return <GameComponent onComplete={handleComplete} />
          })()}

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={backToSubMap}
              className="rounded-full px-4 py-1.5 text-xs font-bold text-cocoa-700/70 hover:bg-cream-100 hover:text-cocoa-900"
            >
              Quay về bản đồ rừng
            </button>
          </div>
        </Card>
      ) : (
        <Card tone="cream" padding="lg" className="overflow-hidden">
          <div
            className={`relative -mx-8 -mt-8 mb-6 grid place-items-center bg-gradient-to-br ${meta.accent} px-6 py-10`}
          >
            <motion.span
              aria-hidden
              initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ ...springBouncy, mass: 0.7 }}
              className="select-none text-7xl drop-shadow-md"
            >
              {node?.emoji ?? '🌳'}
            </motion.span>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border-2 border-sage-300 bg-cream-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-sage-500 shadow-soft">
              <Sparkles className="size-3.5 fill-butter-300 stroke-butter-500" />
              Nhiệm vụ: {meta.mission}
            </div>
          </div>

          <p className="px-1 text-center font-display text-lg font-bold leading-snug text-cocoa-900">
            {node?.label ?? 'Khám phá Rừng Kỳ Diệu'}
          </p>

          <p className="mx-auto mt-3 max-w-prose px-2 text-center text-sm leading-relaxed text-cocoa-700">
            {node?.description ??
              'Trò chơi đa giác quan của Rừng Kỳ Diệu đang được Lumi chuẩn bị. Hãy nhấn nút bên dưới để xem trước và đánh dấu nhiệm vụ là đã trải nghiệm nhé.'}
          </p>

          {alreadyDone && (
            <div className="mt-5 mx-auto inline-flex w-fit items-center gap-2 rounded-full border-2 border-sage-300 bg-sage-100 px-4 py-1.5 text-xs font-bold text-sage-500 shadow-soft">
              <Check className="size-4" />
              Bé đã hoàn thành nhiệm vụ này rồi
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <motion.button
              type="button"
              onClick={handleComplete}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={springBouncy}
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-sage-500 bg-gradient-to-br from-sage-400 to-sage-500 px-6 py-3 font-display text-base font-bold text-white shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200"
            >
              <Sparkles className="size-4 fill-cream-50/40" />
              {alreadyDone ? 'Chơi lại nhiệm vụ' : meta.ctaLabel}
            </motion.button>

            <button
              type="button"
              onClick={backToSubMap}
              className="rounded-full px-4 py-1.5 text-xs font-bold text-cocoa-700/70 hover:bg-cream-100 hover:text-cocoa-900"
            >
              Quay về bản đồ rừng
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] italic text-cocoa-700/60">
            Phiên bản thử nghiệm — trò chơi cảm biến / AI đầy đủ sẽ ra mắt sớm. Nhấn
            nút trên để đánh dấu bé đã trải nghiệm và nhận +
            {CRYSTAL_REWARD[gameId] ?? DEFAULT_REWARD} tinh thể tri thức.
          </p>
        </Card>
      )}
    </PageLayout>
  )
}
