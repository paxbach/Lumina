import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { ColorHunterGame } from '@/components/games/ColorHunterGame'
import { useAppStore } from '@/store/useAppStore'

export default function ColorHunterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subNodeRegionId = searchParams.get('region')
  const subNodeId = searchParams.get('node')
  const saveMemory = useAppStore((s) => s.saveMemory)
  const completeSubNode = useAppStore((s) => s.completeSubNode)

  // Minigames don't decorate, but they still write to the same diary so
  // the photo lands in the Scrapbook alongside quest captures. EXIF/GPS
  // strip happens inside saveMemory (canvas re-encode).
  const handleSave = async (imageBase64: string, questTitle: string) => {
    await saveMemory({
      imagePath: imageBase64,
      questTitle,
      regionId: subNodeRegionId ?? 'thanh-pho-thong-minh',
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
            <p className="text-xs font-semibold uppercase tracking-widest text-peach-500">
              Mini-game
            </p>
            <h1 className="text-xl font-display font-bold text-cocoa-900">
              Vòng Quay Săn Màu
            </h1>
          </div>
        </div>
      }
    >
      <Card tone="cream" padding="lg">
        <ColorHunterGame onSave={handleSave} />
      </Card>
    </PageLayout>
  )
}
