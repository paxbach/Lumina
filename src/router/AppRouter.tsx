import { lazy, Suspense, type ReactNode } from 'react'
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useUser } from '@/contexts/UserContext'

const HomePage         = lazy(() => import('@/pages/HomePage'))
const WorldMapPage     = lazy(() => import('@/pages/WorldMapPage'))
const QuestsPage       = lazy(() => import('@/pages/QuestsPage'))
const QuestDetailPage  = lazy(() => import('@/pages/QuestDetailPage'))
const LumiPage         = lazy(() => import('@/pages/LumiPage'))
const ColorMixPage     = lazy(() => import('@/pages/ColorMixPage'))
const ColorHunterPage  = lazy(() => import('@/pages/ColorHunterPage'))
const FamilyChefPage   = lazy(() => import('@/pages/FamilyChefPage'))
const MemoryPuzzlePage = lazy(() => import('@/pages/MemoryPuzzlePage'))
const ForestGamePage   = lazy(() => import('@/pages/ForestGamePage'))
const ZooPhotoQuestPage = lazy(() => import('@/pages/ZooPhotoQuestPage'))
const VietnamHistoryMission = lazy(
  () => import('@/pages/cultural-island/VietnamHistoryMission'),
)
const ShapeHunterMission = lazy(
  () => import('@/pages/science-mountain/ShapeHunterMission'),
)
const CityBuilderMission = lazy(
  () => import('@/pages/smart-city/CityBuilderMission'),
)
const TetColorHuntMission = lazy(
  () => import('@/pages/cultural-island/TetColorHuntMission'),
)
const MomMealMission = lazy(
  () => import('@/pages/family-kingdom/MomMealMission'),
)
const LeafMatchMission = lazy(
  () => import('@/pages/lumi/LeafMatchMission'),
)
const FamilyPage       = lazy(() => import('@/pages/FamilyPage'))
const CreateFamilyPage = lazy(() => import('@/pages/CreateFamilyPage'))
const JoinFamilyPage   = lazy(() => import('@/pages/JoinFamilyPage'))
const FamilyDashboardPage = lazy(() => import('@/pages/FamilyDashboardPage'))
const LessonsPage      = lazy(() => import('@/pages/LessonsPage'))
const LessonDetailPage = lazy(() => import('@/pages/LessonDetailPage'))
const ProfilePage      = lazy(() => import('@/pages/ProfilePage'))
const OnboardingPage   = lazy(() => import('@/pages/OnboardingPage'))
const NotFoundPage     = lazy(() => import('@/pages/NotFoundPage'))

function PageFallback() {
  return (
    <div className="grid min-h-dvh place-items-center text-cocoa-700">
      <div className="animate-pulse text-lg font-display">Đang tải…</div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Route guards
   ────────────────────────────────────────────────────────────────────
   • RequireUser — wrapped around the AppShell layout. If the kid hasn't
     completed onboarding (no `currentUser` in context/localStorage),
     redirect to /onboarding. This is the bouncer for the whole app.
   • RedirectIfUser — wrapped around the onboarding route so a user who
     already has a profile can't loop back into the welcome screen by
     typing /onboarding. They get sent home instead.
   ════════════════════════════════════════════════════════════════════ */

function RequireUser({ children }: { children: ReactNode }) {
  const { currentUser } = useUser()
  if (!currentUser) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RedirectIfUser({ children }: { children: ReactNode }) {
  const { currentUser } = useUser()
  if (currentUser) return <Navigate to="/" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  // Onboarding route lives OUTSIDE the AppShell layout so the welcome
  // screen renders edge-to-edge with no bottom nav bar — a single,
  // focused flow until the kid hits "Bắt đầu phiêu lưu".
  {
    path: '/onboarding',
    element: (
      <RedirectIfUser>
        <OnboardingPage />
      </RedirectIfUser>
    ),
  },
  {
    element: (
      <RequireUser>
        <AppShell />
      </RequireUser>
    ),
    children: [
      { path: '/',              element: <HomePage /> },
      { path: '/map',           element: <WorldMapPage /> },
      { path: '/quests',        element: <QuestsPage /> },
      { path: '/quests/:id',    element: <QuestDetailPage /> },
      { path: '/lumi',              element: <LumiPage /> },
      { path: '/games/color-mix',      element: <ColorMixPage /> },
      // "Ghép Lá Rừng" — AR pet-feeding game (Chơi cùng Lumi card).
      { path: '/games/leaf-match',     element: <LeafMatchMission /> },
      { path: '/games/color-hunter',   element: <ColorHunterPage /> },
      { path: '/games/family-chef',    element: <FamilyChefPage /> },
      { path: '/games/memory-puzzle',  element: <MemoryPuzzlePage /> },
      // Rừng Kỳ Diệu multi-sensory game family — single placeholder page
      // resolves the 5 routes (`leaf-scanner`, `color-picker`,
      // `light-detector`, `zoo-safari`, `shape-match`) until each game
      // gets its own implementation.
      { path: '/game/forest/:gameId',  element: <ForestGamePage /> },
      // Zoo Adventure photo missions (parameterised by `:animalId` so
      // `lion` / `elephant` / `monkey` all resolve through one page).
      { path: '/photo-quests/zoo/:animalId', element: <ZooPhotoQuestPage /> },
      // Đảo Văn Hoá — Hành trình ngược dòng thời gian
      { path: '/cultural-island/vietnam-history', element: <VietnamHistoryMission /> },
      // Núi Khoa Học — AR Shape Hunter mini-game (camera + canvas).
      { path: '/science-mountain/shape-hunter', element: <ShapeHunterMission /> },
      // Thành Phố Thông Minh — AR City Builder counting game.
      { path: '/smart-city/city-builder', element: <CityBuilderMission /> },
      // Đảo Văn Hoá — Tết Color Hunt AR scavenger.
      { path: '/cultural-island/tet-color-hunt', element: <TetColorHuntMission /> },
      // Vương Quốc Gia Đình — "Bữa cơm của mẹ" tap-to-decorate game.
      { path: '/family-kingdom/mom-meal', element: <MomMealMission /> },
      { path: '/family',           element: <FamilyPage /> },
      // ─── Multiplayer (Supabase Realtime sync) ──────────────────
      { path: '/create-family',    element: <CreateFamilyPage /> },
      { path: '/join-family',      element: <JoinFamilyPage /> },
      { path: '/family-dashboard', element: <FamilyDashboardPage /> },
      { path: '/lessons',       element: <LessonsPage /> },
      { path: '/lessons/:id',   element: <LessonDetailPage /> },
      { path: '/profile',       element: <ProfilePage /> },
      { path: '*',              element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
