import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/utils/cn'
import { pageVariants } from '@/utils/motion'

interface PageLayoutProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  /** Constrain content width — tablet-first defaults */
  maxWidth?: 'md' | 'lg' | 'xl' | 'full'
}

const maxW = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-none',
}

export function PageLayout({
  children,
  header,
  footer,
  className,
  maxWidth = 'xl',
}: PageLayoutProps) {
  return (
    <motion.section
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={cn('flex min-h-full flex-col', className)}
    >
      {header && (
        <header className="sticky top-0 z-20 backdrop-blur-md bg-cream-50/70 border-b border-cream-200">
          <div
            className={cn(
              'mx-auto flex w-full items-center gap-3 px-5 py-4 sm:px-8',
              maxW[maxWidth],
            )}
          >
            <div className="min-w-0 flex-1">{header}</div>
            <UserAvatar />
          </div>
        </header>
      )}

      <main
        className={cn(
          'mx-auto w-full flex-1 px-5 py-6 sm:px-8 sm:py-10',
          maxW[maxWidth],
        )}
      >
        {children}
      </main>

      {footer && (
        <footer className="border-t border-cream-200 bg-cream-50/60">
          <div className={cn('mx-auto w-full px-5 py-4 sm:px-8', maxW[maxWidth])}>
            {footer}
          </div>
        </footer>
      )}
    </motion.section>
  )
}

/* ────────────────────────────────────────────────────────── */

/**
 * Small pastel avatar in the page header — entry point to /profile.
 * Hidden when already on the profile page to avoid a self-link. Reads
 * name + avatar from `<UserContext>` so the chip stays in sync with the
 * onboarding choice (and any future avatar swap inside ProfilePage).
 */
function UserAvatar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { currentUser } = useUser()

  if (pathname === '/profile') return null

  // RequireUser guard ensures currentUser is non-null inside AppShell,
  // but we keep a defensive fallback so a stray render during the
  // onboarding → app transition can't crash on a null deref.
  const avatar = currentUser?.avatar ?? '✨'
  const name = currentUser?.name ?? 'Bé'

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/profile')}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      aria-label={`Mở hồ sơ của ${name}`}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full',
        'border-2 border-lavender-200 bg-lavender-50 text-2xl shadow-soft',
        'hover:bg-lavender-100 transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200',
      )}
    >
      <span aria-hidden>{avatar}</span>
    </motion.button>
  )
}
