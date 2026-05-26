import { useMemo } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { ZooSafariPhotoGame } from '@/components/games/ZooSafariPhotoGame'
import { useAppStore } from '@/store/useAppStore'

/* ════════════════════════════════════════════════════════════════════
   ZooPhotoQuestPage
   ────────────────────────────────────────────────────────────────────
   Thin host for `/photo-quests/zoo/:animalId`. The actual game flow
   (choose animal → camera viewfinder → polaroid success) lives in
   `ZooSafariPhotoGame`; this page only:
     1. Resolves region + sub-node from the URL,
     2. Wires `onSavePhoto` → diary saveMemory,
     3. Wires `onComplete` → addCrystals + completeSubNode + return.

   Navigation guarantee — every back-path includes `?region=<id>` so
   the kid always lands on the sub-map they came from, never the
   world view. The fallback default region (`rung-ky-dieu`) covers the
   edge case where someone deep-links the page without query string.
   ════════════════════════════════════════════════════════════════════ */

const DEFAULT_REGION = 'rung-ky-dieu'

export default function ZooPhotoQuestPage() {
  const navigate = useNavigate()
  const { animalId = '' } = useParams<{ animalId: string }>()
  const [searchParams] = useSearchParams()
  const regionId = searchParams.get('region') ?? DEFAULT_REGION
  const nodeId = searchParams.get('node')

  const regions = useAppStore((s) => s.regions)
  const completeSubNode = useAppStore((s) => s.completeSubNode)
  const addCrystals = useAppStore((s) => s.addCrystals)
  const saveMemory = useAppStore((s) => s.saveMemory)

  // Resolve the sub-node from the live store. Lookup order:
  //   1. by explicit ?node=<id> query (the normal path from the sub-map),
  //   2. by `targetId === animalId` (deep-link / stale-query safety net),
  //   3. give up gracefully — UI still renders, just without store ties.
  const { region, node } = useMemo(() => {
    const r = regions.find((x) => x.id === regionId) ?? null
    if (!r) return { region: null, node: null }
    const n =
      (nodeId ? r.subNodes.find((s) => s.id === nodeId) : undefined) ??
      r.subNodes.find((s) => s.targetId === animalId) ??
      null
    return { region: r, node: n }
  }, [regions, regionId, nodeId, animalId])

  // EVERY back navigation goes back to the originating sub-map with
  // the region query, never bare `/map` — that's how WorldMapPage
  // re-opens the sub-map after the round-trip. Falls back to the
  // default region if `region` somehow couldn't be resolved.
  const backToSubMap = () => {
    const targetRegion = region?.id ?? regionId ?? DEFAULT_REGION
    navigate(`/map?region=${targetRegion}`)
  }

  /** Diary save — non-fatal: photo still shows in the success view if
   *  saveMemory rejects. Wrapped so the EXIF/GPS scrub guardrail and
   *  the "Day N" stamp inside the store action stay authoritative. */
  const handleSavePhoto = async (imageBase64: string) => {
    const title = node?.label ?? 'Thám Hiểm Safari'
    const regionForMemory = region?.id ?? DEFAULT_REGION
    try {
      await saveMemory({
        imagePath: imageBase64,
        questTitle: title,
        regionId: regionForMemory,
      })
    } catch {
      // Swallow — the photo preview is the user-visible feedback and
      // the next save attempt can retry. We deliberately do NOT throw
      // back to the game; the kid shouldn't see an error toast for a
      // best-effort persistence step.
    }
  }

  /** Final CTA: award the crystal, mark the node complete, return. */
  const handleComplete = () => {
    if (region && node && !node.isCompleted) {
      addCrystals(1)
      completeSubNode(region.id, node.id)
    }
    backToSubMap()
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div className="flex items-center gap-3">
          <IconButton label="Quay lại" tone="cream" onClick={backToSubMap}>
            <ArrowLeft />
          </IconButton>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
              Zoo Adventure · Safari
            </p>
            <h1 className="text-xl font-display font-bold text-cocoa-900">
              {node?.label ?? 'Thám Hiểm Safari'}
            </h1>
          </div>
        </div>
      }
    >
      <Card tone="cream" padding="lg">
        {/* Micro-header — compact mission strip + "Đã hoàn thành" pill
            so the rich game body can take over the rest of the card. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500">
              Nhiệm vụ chụp ảnh
            </p>
            <p className="mt-0.5 font-display text-sm font-bold text-cocoa-900">
              {node?.label ?? 'Thám Hiểm Safari'}
            </p>
          </div>
          {node?.isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-sage-300 bg-sage-100 px-2.5 py-0.5 text-[11px] font-bold text-sage-500 shadow-soft">
              <Check className="size-3.5" />
              Đã hoàn thành
            </span>
          )}
        </div>

        <ZooSafariPhotoGame
          onSavePhoto={handleSavePhoto}
          onComplete={handleComplete}
        />

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={backToSubMap}
            className="rounded-full px-4 py-1.5 text-xs font-bold text-cocoa-700/70 hover:bg-cream-100 hover:text-cocoa-900"
          >
            Quay về bản đồ rừng
          </button>
        </div>
      </Card>
    </PageLayout>
  )
}
