import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

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
const FamilyPage       = lazy(() => import('@/pages/FamilyPage'))
const LessonsPage      = lazy(() => import('@/pages/LessonsPage'))
const LessonDetailPage = lazy(() => import('@/pages/LessonDetailPage'))
const ProfilePage      = lazy(() => import('@/pages/ProfilePage'))
const NotFoundPage     = lazy(() => import('@/pages/NotFoundPage'))

function PageFallback() {
  return (
    <div className="grid min-h-dvh place-items-center text-cocoa-700">
      <div className="animate-pulse text-lg font-display">Đang tải…</div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/',              element: <HomePage /> },
      { path: '/map',           element: <WorldMapPage /> },
      { path: '/quests',        element: <QuestsPage /> },
      { path: '/quests/:id',    element: <QuestDetailPage /> },
      { path: '/lumi',              element: <LumiPage /> },
      { path: '/games/color-mix',      element: <ColorMixPage /> },
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
      { path: '/family',        element: <FamilyPage /> },
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
