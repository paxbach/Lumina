import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Users } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Card } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/utils/cn'
import { springBouncy } from '@/utils/motion'
import type { MemberRole } from '@/types/family'

const AVATAR_OPTIONS = ['🦊', '🐻', '🐰', '🐼', '🦁', '🐯', '🦄', '🐸', '🐧', '🦉']
const ROLES: { value: MemberRole; label: string; emoji: string }[] = [
  { value: 'parent', label: 'Ba / Mẹ', emoji: '👨‍👩‍👧' },
  { value: 'child',  label: 'Bé',       emoji: '🧒' },
]

export default function CreateFamilyPage() {
  const navigate = useNavigate()
  const { currentUser } = useUser()
  const createFamily = useFamilyStore((s) => s.createFamily)

  const [familyName, setFamilyName] = useState('')
  const [founderName, setFounderName] = useState(currentUser?.name ?? '')
  const [founderAvatar, setFounderAvatar] = useState(
    currentUser?.avatar ?? AVATAR_OPTIONS[0],
  )
  const [founderRole, setFounderRole] = useState<MemberRole>('parent')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError(null)
    if (!familyName.trim()) return setError('Hãy đặt tên cho gia đình nhé!')
    if (!founderName.trim()) return setError('Hãy nhập tên hiển thị của bạn.')
    setSubmitting(true)
    try {
      await createFamily({
        familyName,
        founderName,
        founderAvatar,
        founderRole,
      })
      navigate('/family-dashboard', { replace: true })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không tạo được gia đình. Hãy thử lại sau giây lát.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout
      maxWidth="lg"
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lavender-500">
            Family Adventure
          </p>
          <h1 className="font-display text-2xl text-cocoa-900">
            Tạo Phòng Gia Đình
          </h1>
          <p className="mt-1 max-w-xl text-sm text-cocoa-700/80">
            Tạo một không gian chung để gia đình bạn cùng đồng hành với những
            gia đình khác trong hành trình khám phá của Lumi.
          </p>
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[1.1fr_1fr]">
        {/* Form column */}
        <Card tone="cream" padding="lg" className="flex flex-col gap-6">
          {/* Family name */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Tên gia đình
            </span>
            <input
              type="text"
              value={familyName}
              maxLength={32}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="VD: Gia đình Vui Vẻ"
              className={cn(
                'h-14 rounded-cozy border-2 border-cream-200 bg-white px-5 text-lg',
                'font-display text-cocoa-900 placeholder:text-cocoa-700/40',
                'focus:border-lavender-300 focus:outline-none focus:ring-4 focus:ring-lavender-200',
              )}
            />
          </label>

          {/* Display name */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Tên hiển thị của bạn
            </span>
            <input
              type="text"
              value={founderName}
              maxLength={24}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="VD: Mẹ"
              className={cn(
                'h-14 rounded-cozy border-2 border-cream-200 bg-white px-5 text-lg',
                'font-display text-cocoa-900 placeholder:text-cocoa-700/40',
                'focus:border-lavender-300 focus:outline-none focus:ring-4 focus:ring-lavender-200',
              )}
            />
          </label>

          {/* Avatar picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Chọn ảnh đại diện
            </span>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((a) => (
                <motion.button
                  key={a}
                  type="button"
                  onClick={() => setFounderAvatar(a)}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ y: -2 }}
                  transition={springBouncy}
                  className={cn(
                    'grid size-12 place-items-center rounded-2xl border-2 text-2xl shadow-soft',
                    a === founderAvatar
                      ? 'border-lavender-400 bg-lavender-100'
                      : 'border-cream-200 bg-white hover:border-lavender-200',
                  )}
                  aria-label={`Chọn avatar ${a}`}
                >
                  <span aria-hidden>{a}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Role picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">Vai trò</span>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <motion.button
                  key={r.value}
                  type="button"
                  onClick={() => setFounderRole(r.value)}
                  whileTap={{ scale: 0.97 }}
                  transition={springBouncy}
                  className={cn(
                    'flex items-center gap-3 rounded-cozy border-2 px-4 py-3 text-left shadow-soft',
                    r.value === founderRole
                      ? 'border-peach-400 bg-peach-100'
                      : 'border-cream-200 bg-white hover:border-peach-200',
                  )}
                >
                  <span className="text-2xl" aria-hidden>{r.emoji}</span>
                  <span className="font-display font-semibold text-cocoa-900">
                    {r.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-cozy border-2 border-peach-200 bg-peach-50 px-4 py-3 text-sm text-cocoa-800">
              {error}
            </p>
          )}

          <Button
            tone="lavender"
            size="lg"
            fullWidth
            leftIcon={<Sparkles className="size-5" />}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Đang tạo…' : 'Tạo Phòng Gia Đình'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/join-family')}
            className="text-sm font-semibold text-cocoa-700 underline-offset-4 hover:underline"
          >
            Đã có Mã Kết Nối Gia Đình? Tham Gia Phòng Gia Đình →
          </button>
        </Card>

        {/* Preview column */}
        <Card tone="lavender" padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-lavender-500">
            <Users className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Xem trước
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 p-6 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-full border-2 border-lavender-200 bg-lavender-50 text-3xl">
                <span aria-hidden>{founderAvatar}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl text-cocoa-900">
                  {founderName || 'Tên hiển thị'}
                </p>
                <p className="text-sm text-cocoa-700/80">
                  {founderRole === 'parent' ? 'Ba / Mẹ' : 'Bé'} · Cấp 1
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border-2 border-dashed border-lavender-300 bg-lavender-50/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-lavender-500">
                Tên gia đình
              </p>
              <p className="mt-1 font-display text-lg text-cocoa-900">
                {familyName || 'Chưa có tên'}
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-cocoa-700/80">
              Sau khi tạo, bạn sẽ nhận được <strong>Mã Kết Nối Gia Đình</strong>{' '}
              để chia sẻ với các gia đình khác. Họ chỉ cần nhập mã trên thiết bị
              của mình để cùng tham gia hành trình khám phá.
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}
