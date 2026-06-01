import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogIn, Users } from 'lucide-react'
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

export default function JoinFamilyPage() {
  const navigate = useNavigate()
  const { currentUser } = useUser()
  const family = useFamilyStore((s) => s.family)
  const joinFamily = useFamilyStore((s) => s.joinFamily)

  const [inviteCode, setInviteCode] = useState(family ? family.inviteCode : '')
  const [displayName, setDisplayName] = useState(currentUser?.name ?? '')
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? AVATAR_OPTIONS[2])
  const [role, setRole] = useState<MemberRole>('child')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await joinFamily({
        inviteCode,
        displayName,
        avatar,
        role,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/family-dashboard', { replace: true })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không tham gia được gia đình. Hãy thử lại sau giây lát.',
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
            Đa người chơi
          </p>
          <h1 className="font-display text-2xl text-cocoa-900">
            Tham gia gia đình
          </h1>
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[1.1fr_1fr]">
        {/* Form */}
        <Card tone="cream" padding="lg" className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Mã mời gia đình
            </span>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="LUMINA-XXXX"
              spellCheck={false}
              autoCapitalize="characters"
              className={cn(
                'h-14 rounded-cozy border-2 border-cream-200 bg-white px-5',
                'font-display text-xl tracking-[0.2em] text-cocoa-900',
                'placeholder:tracking-normal placeholder:text-cocoa-700/40',
                'focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-200',
              )}
            />
            {family && (
              <p className="text-xs text-cocoa-700/70">
                Trình duyệt này đã có gia đình{' '}
                <strong>{family.familyName}</strong> · mã mời{' '}
                <strong>{family.inviteCode}</strong>.
              </p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Tên hiển thị của bạn
            </span>
            <input
              type="text"
              value={displayName}
              maxLength={24}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VD: Bé Emma"
              className={cn(
                'h-14 rounded-cozy border-2 border-cream-200 bg-white px-5 text-lg',
                'font-display text-cocoa-900 placeholder:text-cocoa-700/40',
                'focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-200',
              )}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">
              Chọn ảnh đại diện
            </span>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((a) => (
                <motion.button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ y: -2 }}
                  transition={springBouncy}
                  className={cn(
                    'grid size-12 place-items-center rounded-2xl border-2 text-2xl shadow-soft',
                    a === avatar
                      ? 'border-sky-300 bg-sky-100'
                      : 'border-cream-200 bg-white hover:border-sky-200',
                  )}
                  aria-label={`Chọn avatar ${a}`}
                >
                  <span aria-hidden>{a}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-cocoa-700">Vai trò</span>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <motion.button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  whileTap={{ scale: 0.97 }}
                  transition={springBouncy}
                  className={cn(
                    'flex items-center gap-3 rounded-cozy border-2 px-4 py-3 text-left shadow-soft',
                    r.value === role
                      ? 'border-butter-400 bg-butter-100'
                      : 'border-cream-200 bg-white hover:border-butter-200',
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
            tone="sky"
            size="lg"
            fullWidth
            leftIcon={<LogIn className="size-5" />}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Đang tham gia…' : 'Tham gia gia đình'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/create-family')}
            className="text-sm font-semibold text-cocoa-700 underline-offset-4 hover:underline"
          >
            Chưa có gia đình? Tạo mới →
          </button>
        </Card>

        {/* Tips column */}
        <Card tone="sky" padding="lg" className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sky-500">
            <Users className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Mẹo demo
            </p>
          </div>
          <ol className="space-y-3 text-sm leading-relaxed text-cocoa-800">
            <li>
              <strong>1.</strong> Mở một tab khác trong cùng trình duyệt.
            </li>
            <li>
              <strong>2.</strong> Tab thứ nhất đã tạo gia đình và sao chép
              mã mời (VD: <code className="rounded bg-white/70 px-1.5 py-0.5">LUMINA-AB12</code>).
            </li>
            <li>
              <strong>3.</strong> Tab này nhập mã, chọn tên + avatar khác,
              rồi nhấn <em>Tham gia gia đình</em>.
            </li>
            <li>
              <strong>4.</strong> Cả hai tab sẽ thấy nhau trong danh sách
              thành viên và cùng đóng góp vào nhiệm vụ chung.
            </li>
          </ol>
          <div className="rounded-xl bg-white/70 px-4 py-3 text-xs text-cocoa-700">
            ⚡ Demo dùng <strong>Supabase Realtime</strong> — hai trình
            duyệt, hai máy, hay hai mạng khác nhau đều đồng bộ. Đảm bảo
            đã thiết lập <code className="rounded bg-cream-50 px-1.5 py-0.5">.env.local</code> với
            URL + anon key của project Supabase.
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}
