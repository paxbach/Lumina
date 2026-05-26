import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Map, ScrollText, Sparkles, Users } from 'lucide-react'
import { cn } from '@/utils/cn'
import { BackgroundThemeMusic } from '@/components/audio/BackgroundThemeMusic'

const navItems = [
  { to: '/',       label: 'Home',     icon: Home,       end: true },
  { to: '/map',    label: 'Bản đồ',   icon: Map },
  { to: '/quests', label: 'Nhiệm vụ', icon: ScrollText },
  { to: '/lumi',   label: 'Lumi',     icon: Sparkles },
  { to: '/family', label: 'Gia đình', icon: Users },
]

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[1024px] flex-col">
      {/* Global background theme. Lives at the shell level (outside the
          per-route AnimatePresence) so the audio element survives every
          page transition — music keeps looping as the kid drills into
          a sub-map, opens a game, or hops to /family. */}
      <BackgroundThemeMusic />

      <AnimatePresence mode="wait">
        <motion.div key={pathname} className="flex-1 pb-24">
          <Outlet />
        </motion.div>
      </AnimatePresence>

      {/* Bottom tab bar — tablet/mobile-first navigation */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[1024px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <ul
          className={cn(
            'mx-auto flex items-center justify-around gap-1 rounded-full',
            'border-2 border-cream-200 bg-cream-50/95 px-2 py-2 shadow-pop backdrop-blur',
            'sm:gap-2 sm:px-3',
          )}
        >
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex flex-col items-center justify-center gap-0.5 rounded-full',
                    'px-2 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs',
                    isActive
                      ? 'text-lavender-500'
                      : 'text-cocoa-700/70 hover:text-cocoa-800',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-lavender-100"
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                      />
                    )}
                    <Icon className="size-5" aria-hidden />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
