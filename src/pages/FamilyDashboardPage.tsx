import { useNavigate } from 'react-router-dom'
import { Sparkles, Star } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui'
import { useFamilyStore } from '@/store/useFamilyStore'
import { useFamilyRealtime } from '@/hooks/useFamilyRealtime'
import { MembersPanel } from '@/components/multiplayer/MembersPanel'
import { SharedQuestCard } from '@/components/multiplayer/SharedQuestCard'
import { ActivityFeed } from '@/components/multiplayer/ActivityFeed'
import { RewardShelf } from '@/components/multiplayer/RewardShelf'
import { InviteCodeBadge } from '@/components/multiplayer/InviteCodeBadge'
import { QuestCompletionOverlay } from '@/components/multiplayer/QuestCompletionOverlay'

/**
 * Multiplayer Dashboard — tablet-landscape layout (1024px AppShell cap).
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Header: family name · level · stars · invite code    │
 *   ├─────────────────────────┬────────────────────────────┤
 *   │ Members (A)             │ Activity Feed (C)          │
 *   │ Shared Quest (B)        │                            │
 *   ├─────────────────────────┴────────────────────────────┤
 *   │ Shared Rewards (D)                                   │
 *   └──────────────────────────────────────────────────────┘
 *
 * Mounts useFamilyRealtime, which subscribes the tab to the Supabase
 * Realtime channel for this family (postgres_changes + presence).
 */
export default function FamilyDashboardPage() {
  const navigate = useNavigate()
  const family = useFamilyStore((s) => s.family)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)

  useFamilyRealtime()

  if (!family) {
    return (
      <PageLayout maxWidth="lg">
        <div className="grid place-items-center gap-6 py-20 text-center">
          <div className="text-5xl">🏡</div>
          <h2 className="font-display text-2xl text-cocoa-900">
            Chưa có gia đình nào
          </h2>
          <p className="max-w-md text-cocoa-700/80">
            Hãy tạo một gia đình mới hoặc nhập mã mời để tham gia gia đình
            sẵn có.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button tone="lavender" size="lg" onClick={() => navigate('/create-family')}>
              Tạo gia đình
            </Button>
            <Button tone="sky" size="lg" variant="soft" onClick={() => navigate('/join-family')}>
              Tham gia gia đình
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      maxWidth="full"
      header={
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lavender-500">
              Đa người chơi · Demo
            </p>
            <h1 className="truncate font-display text-2xl text-cocoa-900">
              {family.familyName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border-2 border-butter-200 bg-butter-50 px-3 py-1.5 sm:flex">
              <Sparkles className="size-4 text-butter-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-cocoa-700">
                Lv {family.familyLevel}
              </span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border-2 border-peach-200 bg-peach-50 px-3 py-1.5 sm:flex">
              <Star className="size-4 fill-peach-500 text-peach-500" />
              <span className="text-xs font-bold tabular-nums text-cocoa-700">
                {family.familyStars}
              </span>
            </div>
            <InviteCodeBadge />
          </div>
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Left column: Members + Quest */}
        <div className="flex flex-col gap-5">
          <MembersPanel />
          <SharedQuestCard />
        </div>
        {/* Right column: Activity feed */}
        <ActivityFeed />
        {/* Full-width rewards strip */}
        <div className="lg:col-span-2">
          <RewardShelf />
        </div>
      </div>

      {!currentMemberId && (
        <div className="mx-auto mt-6 max-w-3xl rounded-cozy border-2 border-sky-200 bg-sky-50 px-5 py-4 text-center text-sm text-cocoa-800">
          Tab này chỉ đang <em>xem</em>. Để cùng đóng góp, hãy nhập mã mời
          ở trang{' '}
          <button
            type="button"
            onClick={() => navigate('/join-family')}
            className="font-semibold text-sky-600 underline-offset-4 hover:underline"
          >
            Tham gia gia đình
          </button>
          .
        </div>
      )}

      <QuestCompletionOverlay />
    </PageLayout>
  )
}
