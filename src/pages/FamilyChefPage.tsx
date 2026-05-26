import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { FamilyChefGame } from '@/components/games/FamilyChefGame'
import { useAppStore } from '@/store/useAppStore'

export default function FamilyChefPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subNodeRegionId = searchParams.get('region') ?? 'vuong-quoc-gia-dinh'
  const subNodeId = searchParams.get('node')
  const completeSubNode = useAppStore((s) => s.completeSubNode)

  // CameraCaptureModal inside FamilyChefGame now owns the diary save
  // (via `saveContext`) — so this handler is reduced to ticking the
  // sub-node done. Calling saveMemory here too would create a duplicate
  // polaroid in the timeline.
  const handleSave = (_imageBase64: string, _questTitle: string) => {
    if (subNodeId) {
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
            <p className="text-xs font-semibold uppercase tracking-widest text-mint-500">
              Mini-game
            </p>
            <h1 className="text-xl font-display font-bold text-cocoa-900">
              Siêu Đầu Bếp Nhí
            </h1>
          </div>
        </div>
      }
    >
      <Card tone="cream" padding="lg">
        <FamilyChefGame regionId={subNodeRegionId} onSave={handleSave} />
      </Card>
    </PageLayout>
  )
}
