import { useMemo, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Lock, Sparkles } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { LeafCountingGame } from '@/components/quest/LeafCountingGame'
import { MagicCamera } from '@/components/quest/MagicCamera'
import type { MemoryDecoration } from '@/components/quest/DecorateMemoryScreen'
import {
  BedtimeRoutinePuzzle,
  FloatSinkChallenge,
  MooncakeTraySort,
  TrafficKeypadChallenge,
} from '@/components/quest/thematic'
import {
  DIFFICULTIES,
  DifficultyCard,
  type Difficulty,
} from '@/components/quest/DifficultyCard'
import { DiscoveryCard } from '@/components/quest/DiscoveryCard'
import { MiniMap } from '@/components/quest/MiniMap'
import { StoryScroll } from '@/components/quest/StoryScroll'
import { VictoryScene, type VictoryRewards } from '@/components/quest/VictoryScene'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { QUESTS, type QuestDef, type QuestMinigameKind } from '@/data/quests'
import type { DiarySticker, PastelTone } from '@/types'

/**
 * Dispatch from quest.minigameKind → the matching thematic minigame.
 * Every entry takes `onComplete: () => void`, so QuestDetailPage can
 * stay agnostic about the inner mechanic.
 */
const MINIGAME_COMPONENT: Record<
  QuestMinigameKind,
  ComponentType<{ onComplete: () => void }>
> = {
  'leaf-count':      LeafCountingGame,
  'traffic-keypad':  TrafficKeypadChallenge,
  'mooncake-tray':   MooncakeTraySort,
  'float-sink':      FloatSinkChallenge,
  'bedtime-routine': BedtimeRoutinePuzzle,
}

/** CTA copy used on the Discovery → Minigame transition button. */
const MINIGAME_CTA: Record<QuestMinigameKind, string> = {
  'leaf-count':      'Vào thử thách rừng',
  'traffic-keypad':  'Vào thử thách thành phố',
  'mooncake-tray':   'Vào chuẩn bị lễ hội',
  'float-sink':      'Vào thí nghiệm khoa học',
  'bedtime-routine': 'Vào giờ đi ngủ',
}

/** Card tone for the minigame container, matched to quest theme. */
const MINIGAME_CARD_TONE: Record<PastelTone, PastelTone> = {
  peach:    'peach',
  mint:     'mint',
  butter:   'butter',
  lavender: 'lavender',
  sky:      'sky',
}

type Stage = 'briefing' | 'discovery' | 'minigame' | 'victory'

export default function QuestDetailPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addCrystals = useAppStore((s) => s.addCrystals)
  const addStars = useAppStore((s) => s.addStars)
  const forestRevival = useAppStore((s) => s.forestRevival)
  const setForestRevival = useAppStore((s) => s.setForestRevival)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const saveMemory = useAppStore((s) => s.saveMemory)

  // Resolve the quest by id, or null when the route param doesn't match.
  // Returning a hard `null` (instead of silently falling back to QUESTS[0])
  // means a typo in a sub-node's `targetId` surfaces visibly as a
  // "Không tìm thấy nhiệm vụ" card instead of mis-routing the kid into
  // the wrong story.
  const quest = useMemo<QuestDef | null>(
    () => QUESTS.find((q) => q.id === id) ?? null,
    [id],
  )

  const [stage, setStage] = useState<Stage>('briefing')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [storyDone, setStoryDone] = useState(false)
  /** Real-world photo the kid captured/uploaded for this quest. */
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  /**
   * True only after `saveMemory()` has actually resolved and the
   * DiaryEntry is in the store. Drives the minigame CTA: the kid can't
   * advance until they've committed a real (EXIF-scrubbed) memory.
   * Reset to false on retake / exit so a discarded photo can't unlock
   * the next stage on stale truthiness.
   */
  const [isPhotoSaved, setIsPhotoSaved] = useState(false)

  const difficultyMultiplier = useMemo(
    () => (difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.5 : 1),
    [difficulty],
  )

  // Hooks complete — now we may early-return for the missing-quest case.
  // Everything below this guard can treat `quest` as non-null.
  if (!quest) {
    return (
      <PageLayout
        header={
          <div className="flex items-center gap-3">
            <IconButton label="Quay lại" tone="cream" onClick={() => navigate(-1)}>
              <ArrowLeft />
            </IconButton>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-peach-500">
                Nhiệm vụ
              </p>
              <h1 className="font-display text-xl font-bold text-cocoa-900">
                Không tìm thấy nhiệm vụ
              </h1>
            </div>
          </div>
        }
      >
        <Card tone="cream" padding="lg" className="text-center">
          <p className="text-sm text-cocoa-700">
            Không có nhiệm vụ nào khớp với <code className="rounded bg-cream-100 px-1.5 py-0.5 font-mono text-xs">{id}</code>.
            Có thể link đã bị thay đổi hoặc sub-node đang trỏ sai targetId.
          </p>
          <Button
            tone="peach"
            size="lg"
            className="mt-5"
            onClick={() => navigate('/map')}
          >
            Quay về bản đồ
          </Button>
        </Card>
      </PageLayout>
    )
  }

  // Sub-node coordinates are only used to tick the right marker on the world
  // map. They MUST NOT seed regionId for memory entries — that comes from
  // the authoritative quest.regionId below.
  const subNodeRegionId = searchParams.get('region')
  const subNodeId = searchParams.get('node')

  const rewardCrystals = Math.round(quest.rewards.crystals * difficultyMultiplier)
  const rewardStars = Math.round(quest.rewards.stars * difficultyMultiplier)
  const rewardRevival = quest.rewards.revival * difficultyMultiplier

  const finalRevival = Math.min(1, forestRevival + rewardRevival)

  const handleMinigameDone = () => {
    addCrystals(rewardCrystals)
    addStars(rewardStars)
    setForestRevival(finalRevival)
    // Mark the sub-node done only if we have BOTH params and the region in
    // the URL agrees with the quest's canonical region. This guards against
    // a stale URL pointing the celebration at the wrong island.
    if (
      subNodeRegionId &&
      subNodeId &&
      subNodeRegionId === quest.regionId
    ) {
      completeSubNode(subNodeRegionId, subNodeId)
    }
    setStage('victory')
  }

  /**
   * Commit a real-world photo + decoration into the Childhood Diary.
   *
   * Fires from `MagicCamera` ONLY at the end of the decoration step
   * (`DecorateMemoryScreen` → "Lưu vào Nhật ký Ánh sáng"), so by the time
   * we get here both stickers and parent note are final.
   *
   * Pipeline:
   *   1. Pin regionId to the quest's canonical region (never fall back to
   *      'rung-ky-dieu' — that mis-attributes memories on direct nav).
   *   2. Strip `PlacedSticker.uid` → `DiarySticker` (storage shape, no
   *      runtime React keys).
   *   3. Hand off to `saveMemory()` — the store re-encodes the image
   *      through <canvas> to strip EXIF / GPS / device metadata before
   *      persisting (child-safety guardrail).
   */
  const handleMagicCapture = async (
    dataUrl: string,
    decoration?: MemoryDecoration,
  ) => {
    setCapturedImage(dataUrl)
    const stickers: DiarySticker[] =
      decoration?.stickers.map(({ kind, x, y, rotation, size }) => ({
        kind,
        x,
        y,
        rotation,
        size,
      })) ?? []
    // IMPORTANT: rethrow on failure so MagicCamera's own try/catch keeps
    // the decorating screen up (with the stardust spinner gone) — the
    // kid never sees a fake "Đã lưu" on a save that didn't land.
    await saveMemory({
      imagePath: dataUrl,
      questTitle: quest.title,
      parentNote: decoration?.note,
      regionId: quest.regionId,
      stickers,
    })
    setIsPhotoSaved(true)
  }

  /**
   * Fired by MagicCamera when the kid taps "Chụp lại" or the overlay X
   * button. Clears parent-held state so debug snapshots stay honest and
   * the CTA re-disables until a fresh save completes.
   */
  const handleResetCapture = () => {
    setCapturedImage(null)
    setIsPhotoSaved(false)
  }

  /**
   * Overlay X button — bounce the kid back to the quest briefing as a
   * "fresh start" so they can re-read the story or change difficulty
   * before re-opening the camera.
   */
  const handleCameraExit = () => {
    handleResetCapture()
    setStage('briefing')
  }

  if (stage === 'victory') {
    const rewards: VictoryRewards = {
      crystals: rewardCrystals,
      stars: rewardStars,
      forestRevivalBefore: forestRevival,
      forestRevivalAfter: finalRevival,
      unlock: quest.unlock,
      nextChapter: quest.nextChapter,
    }
    // Land back on the sub-map of the quest's region (not the world view)
    // so the kid sees the node they just finished light up green. Prefer
    // the sub-node's region (matches the URL the kid arrived from), and
    // fall back to the quest's canonical region if the param is missing.
    const returnRegion = subNodeRegionId ?? quest.regionId
    return (
      <VictoryScene
        questTitle={quest.title}
        rewards={rewards}
        onContinue={() => navigate(`/map?region=${returnRegion}`)}
        onReturnHome={() => navigate('/')}
      />
    )
  }

  // ── PAGE-LAYOUT STAGES ──────────────────────────────────────
  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div className="flex items-center gap-3">
          <IconButton label="Quay lại" tone="cream" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </IconButton>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
              Chương · {quest.chapter}
            </p>
            <h1 className="truncate font-display text-xl font-bold text-cocoa-900">
              {quest.title}
            </h1>
          </div>
          <StageIndicator stage={stage} />
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {stage === 'briefing' && (
          <Briefing
            key="briefing"
            quest={quest}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            storyDone={storyDone}
            setStoryDone={setStoryDone}
            onBegin={() => {
              // Single-source camera flow: no chooser modal, no mock
              // CameraScene — go straight to Discovery where MagicCamera
              // handles both real-camera and file-upload paths.
              setStage('discovery')
            }}
          />
        )}

        {stage === 'discovery' && (
          <Discovery
            key="discovery"
            quest={quest}
            capturedImage={capturedImage}
            isPhotoSaved={isPhotoSaved}
            onMagicCapture={handleMagicCapture}
            onResetCapture={handleResetCapture}
            onCameraExit={handleCameraExit}
            onContinue={() => setStage('minigame')}
          />
        )}

        {stage === 'minigame' && (
          <ThematicMinigameStage
            key="minigame"
            quest={quest}
            onComplete={handleMinigameDone}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* BRIEFING — story, difficulty, mini-map, CTA                   */
/* ════════════════════════════════════════════════════════════ */

interface BriefingProps {
  quest: QuestDef
  difficulty: Difficulty
  setDifficulty: (d: Difficulty) => void
  storyDone: boolean
  setStoryDone: (b: boolean) => void
  onBegin: () => void
}

function Briefing({
  quest,
  difficulty,
  setDifficulty,
  storyDone,
  setStoryDone,
  onBegin,
}: BriefingProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="space-y-6"
    >
      {/* Story scroll */}
      <StoryScroll beats={quest.story} onFinish={() => setStoryDone(true)} />

      {/* Mission objective */}
      <Card
        tone="peach"
        padding="lg"
        className="relative overflow-hidden"
      >
        <span
          aria-hidden
          className="absolute -right-4 -top-4 text-[6rem] opacity-20 sm:opacity-30"
        >
          {quest.heroEmoji}
        </span>
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-peach-500">
            Mục tiêu
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-cocoa-900">
            {quest.objective}
          </h2>
          <p className="mt-2 max-w-md text-sm text-cocoa-700">
            {quest.objectiveDetail}
          </p>
        </div>
      </Card>

      {/* Mini-map */}
      <section>
        <SectionLabel
          eyebrow="Bản đồ phiêu lưu"
          title="Lumi đã đánh dấu vị trí cho bé"
        />
        <MiniMap
          className="mt-3"
          start={{
            id: 'home',
            label: 'Bé ở đây',
            emoji: '🏘️',
            x: 18,
            y: 70,
            tone: 'peach',
          }}
          target={{
            id: 'target',
            label: quest.location,
            emoji: quest.heroEmoji,
            x: 78,
            y: 30,
            tone: 'butter',
            pulsing: true,
          }}
          distance={quest.distance}
        />
      </section>

      {/* Difficulty */}
      <section>
        <SectionLabel
          eyebrow="Chọn cấp độ"
          title="Bé muốn phiêu lưu xa cỡ nào?"
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DIFFICULTIES.map((option) => (
            <DifficultyCard
              key={option.id}
              option={option}
              selected={difficulty === option.id}
              onSelect={() => setDifficulty(option.id)}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="sticky bottom-24 z-10 -mx-2 rounded-3xl border-2 border-butter-300 bg-cream-50/90 p-3 shadow-pop backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:border-0 sm:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-cocoa-700/80">
            {storyDone
              ? '✨ Lumi đã sẵn sàng — chỉ chờ bé bấm chụp!'
              : 'Đọc trang nhật ký để hiểu nhiệm vụ trước nhé.'}
          </p>
          <Button
            tone="peach"
            size="lg"
            onClick={onBegin}
            rightIcon={<Camera className="size-5" />}
          >
            Bắt đầu hành trình
          </Button>
        </div>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* DISCOVERY                                                     */
/* ════════════════════════════════════════════════════════════ */

function Discovery({
  quest,
  capturedImage,
  isPhotoSaved,
  onMagicCapture,
  onResetCapture,
  onCameraExit,
  onContinue,
}: {
  quest: QuestDef
  capturedImage: string | null
  isPhotoSaved: boolean
  onMagicCapture: (
    dataUrl: string,
    decoration?: MemoryDecoration,
  ) => Promise<void>
  onResetCapture: () => void
  onCameraExit: () => void
  onContinue: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="space-y-6"
    >
      <DiscoveryCard
        itemName={quest.discovery.itemName}
        itemEmoji={quest.discovery.itemEmoji}
        power={quest.discovery.power}
        story={quest.discovery.story}
        knowledgeHook={quest.discovery.knowledgeHook}
      />

      {/* Camera Phép Thuật — single-source capture. The inline section
          stays in this Card; live / captured / decorating phases pop
          into a portal overlay so AppShell's bottom nav can't clip the
          shutter button or the keyboard-summoned parent note input. */}
      <Card tone="butter" padding="lg">
        <MagicCamera
          title="Đóng dấu khoảnh khắc bằng ảnh thật"
          subtitle={`Lumi sẽ nạp ánh sáng tri thức vào ảnh và lưu vào "${quest.title}".`}
          polaroidCaption={quest.title}
          initialImage={capturedImage}
          onCapture={onMagicCapture}
          onReset={onResetCapture}
          onExit={onCameraExit}
        />
      </Card>

      {/* Bypass prevention: the CTA stays locked until saveMemory has
          actually resolved (DiaryEntry written, EXIF scrubbed). A small
          hint explains *why* it's disabled so the kid isn't confused. */}
      <div className="flex flex-col items-end gap-2">
        {!isPhotoSaved && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-cream-200 bg-cream-50/90 px-3 py-1 text-[11px] font-bold text-cocoa-700/80 shadow-soft"
          >
            <Lock className="size-3.5 text-cocoa-700/60" />
            Lưu ảnh vào Nhật ký trước để mở thử thách
          </motion.p>
        )}
        <Button
          tone="lavender"
          size="lg"
          disabled={!isPhotoSaved}
          onClick={onContinue}
          rightIcon={<ArrowRight className="size-5" />}
        >
          {MINIGAME_CTA[quest.minigameKind]}
        </Button>
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* MINIGAME STAGE — dispatches to the quest's thematic component */
/* ════════════════════════════════════════════════════════════ */

function ThematicMinigameStage({
  quest,
  onComplete,
}: {
  quest: QuestDef
  onComplete: () => void
}) {
  const GameComponent = MINIGAME_COMPONENT[quest.minigameKind]
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
    >
      <Card tone={MINIGAME_CARD_TONE[quest.tone]} padding="lg">
        <GameComponent onComplete={onComplete} />
      </Card>
    </motion.section>
  )
}

/* ════════════════════════════════════════════════════════════ */
/* Helpers                                                       */
/* ════════════════════════════════════════════════════════════ */

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-lavender-500">
        {eyebrow}
      </p>
      <h2 className="mt-0.5 font-display text-lg font-bold text-cocoa-900">
        {title}
      </h2>
    </div>
  )
}

function StageIndicator({ stage }: { stage: Stage }) {
  // Camera is no longer its own stage — capture happens inside Discovery
  // via MagicCamera. The indicator collapses to the 4 narrative beats.
  const steps: { id: Stage; emoji: string }[] = [
    { id: 'briefing',  emoji: '📜' },
    { id: 'discovery', emoji: '📸' },
    { id: 'minigame',  emoji: '🎮' },
    { id: 'victory',   emoji: '🏆' },
  ]
  const activeIdx = Math.max(0, steps.findIndex((s) => s.id === stage))
  return (
    <ol className="hidden items-center gap-1 sm:flex" aria-label="Tiến trình">
      {steps.map((s, i) => {
        const active = i === activeIdx
        const done = i < activeIdx
        return (
          <li key={s.id}>
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full border-2 text-sm transition-colors',
                done
                  ? 'border-mint-300 bg-mint-100 opacity-70'
                  : active
                    ? 'border-peach-400 bg-peach-100 shadow-soft'
                    : 'border-cream-200 bg-cream-50 opacity-50',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {s.emoji}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Re-export Sparkles for parent imports if needed. */
export { Sparkles as _Sparkles }
