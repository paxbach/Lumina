import { ArrowLeft, Star } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAppStore } from '@/store/useAppStore'

export default function LessonDetailPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const subNodeRegionId = searchParams.get('region')
  const subNodeId = searchParams.get('node')
  const navigate = useNavigate()
  const lesson = useAppStore((s) => s.lessons.find((l) => l.id === id))
  const setProgress = useAppStore((s) => s.setLessonProgress)
  const addStars = useAppStore((s) => s.addStars)
  const completeSubNode = useAppStore((s) => s.completeSubNode)

  if (!lesson) {
    return (
      <PageLayout>
        <Card tone="cream" className="text-center">
          <p className="text-lg">Không tìm thấy bài học này.</p>
          <Button className="mt-4" onClick={() => navigate('/lessons')}>
            Quay lại thư viện
          </Button>
        </Card>
      </PageLayout>
    )
  }

  const isCompleted = lesson.progress >= 1

  const completeStep = () => {
    if (isCompleted) return
    const nextProgress = lesson.progress + 0.2
    setProgress(lesson.id, nextProgress)
    addStars(1)
    // Mark the originating sub-node done the moment progress hits 100%.
    if (nextProgress >= 1 && subNodeRegionId && subNodeId) {
      completeSubNode(subNodeRegionId, subNodeId)
    }
  }

  return (
    <PageLayout
      header={
        <div className="flex items-center gap-3">
          <IconButton label="Quay lại" tone="cream" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </IconButton>
          <div>
            <p className="text-xs uppercase tracking-widest text-lavender-500 font-semibold">
              Bài học
            </p>
            <h1 className="text-xl font-display font-semibold">{lesson.title}</h1>
          </div>
        </div>
      }
    >
      <Card tone={lesson.tone} padding="lg" className="text-center">
        <div className="mx-auto grid size-24 place-items-center rounded-3xl bg-white/70 text-6xl shadow-inset-soft">
          <span aria-hidden>{lesson.emoji}</span>
        </div>
        <h2 className="mt-5 text-3xl font-display font-bold">{lesson.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-cocoa-700">{lesson.description}</p>

        <div className="mx-auto mt-6 max-w-md">
          <ProgressBar value={lesson.progress} tone={lesson.tone} showLabel size="lg" />
        </div>

        <Button
          tone={lesson.tone}
          size="lg"
          className="mt-8"
          leftIcon={<Star className="size-5 fill-current" />}
          onClick={completeStep}
          disabled={isCompleted}
        >
          {isCompleted ? 'Đã hoàn thành 🎉' : 'Hoàn thành 1 bước (+1 ⭐)'}
        </Button>
      </Card>
    </PageLayout>
  )
}
