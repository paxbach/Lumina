import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { IconButton } from '@/components/ui/IconButton'
import { ColorMixGame } from '@/components/games/ColorMixGame'
import { useAppStore } from '@/store/useAppStore'

export default function ColorMixPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subNodeRegionId = searchParams.get('region')
  const subNodeId = searchParams.get('node')
  const addCrystals = useAppStore((s) => s.addCrystals)
  const completeSubNode = useAppStore((s) => s.completeSubNode)

  const handleWin = () => {
    addCrystals(5)
    if (subNodeRegionId && subNodeId) {
      completeSubNode(subNodeRegionId, subNodeId)
    }
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
            <p className="text-xs font-semibold uppercase tracking-widest text-lavender-500">
              Mini-game
            </p>
            <h1 className="text-xl font-display font-bold text-cocoa-900">
              Trộn Màu Ánh Sáng
            </h1>
          </div>
        </div>
      }
    >
      {/* No Card wrapper — the upgraded ColorMixGame ships its own
          self-contained "Space Light" dark dashboard. Wrapping it in a
          cream Card would put a beige frame around a deep-space panel
          and break the sci-fi aesthetic. */}
      <ColorMixGame onComplete={handleWin} />
    </PageLayout>
  )
}
