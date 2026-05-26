import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <PageLayout>
      <div className="grid place-items-center py-20 text-center">
        <div className="text-7xl">🐾</div>
        <h1 className="mt-4 text-3xl font-display font-bold">Lạc đường rồi!</h1>
        <p className="mt-2 max-w-sm text-cocoa-700">
          Không tìm thấy trang bé tìm. Mình quay về nhà nhé?
        </p>
        <Button className="mt-6" tone="lavender" onClick={() => navigate('/')}>
          Về trang chính
        </Button>
      </div>
    </PageLayout>
  )
}
