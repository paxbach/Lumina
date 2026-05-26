import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { MemoryPuzzleGame } from '@/components/games/MemoryPuzzleGame'
import { useAppStore } from '@/store/useAppStore'

export default function MemoryPuzzlePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subNodeRegionId = searchParams.get('region')
  const subNodeId = searchParams.get('node')
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)

  const handleSolve = async (imageBase64: string, questTitle: string) => {
    await saveMemory({
      imagePath: imageBase64,
      questTitle,
      regionId: subNodeRegionId ?? 'dao-van-hoa',
    })
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
              Ghép Lại Kỷ Niệm
            </h1>
          </div>
        </div>
      }
    >
      <Card tone="cream" padding="lg">
        <MemoryPuzzleGame onSolve={handleSolve} />
      </Card>
    </PageLayout>
  )
}
