import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/* ════════════════════════════════════════════════════════════════════
   UserContext — kid's displayable identity (name + avatar + meta)
   ────────────────────────────────────────────────────────────────────
   Lightweight React Context that owns the "who is using the app right
   now" data. Persists to localStorage on every change so a page reload
   does NOT kick the kid back to onboarding.

   Why a separate Context (vs reusing the existing Zustand store):
     • Onboarding is a gate-keeping concern that runs BEFORE the rest
       of the app mounts; isolating it in its own provider keeps the
       guard logic crisp and avoids re-rendering every store consumer
       when the kid only changes their avatar.
     • Game progress (stars, regions, diary) stays in useAppStore — it
       has different lifecycle semantics (versioned migrations, reset-
       all) than the identity profile.

   The store's `profile.name / profile.avatarEmoji` are now legacy and
   superseded by `currentUser.name / currentUser.avatar`. UI reads have
   been migrated; the store fields remain as harmless orphans.
   ════════════════════════════════════════════════════════════════════ */

export interface UserProfile {
  /** Kid's chosen nickname. Always trimmed, never empty in a valid user. */
  name: string
  /** Single emoji glyph chosen from the onboarding avatar picker. */
  avatar: string
  /** Optional — onboarding does not currently ask for age, but the
   *  field is reserved so future flows can fill it without a context
   *  shape change. */
  age?: number
  /** In-app currency counter. Initialised to 0 on first onboarding;
   *  game logic can mutate via `updateUser({ gems: ... })`. */
  gems: number
}

interface UserContextValue {
  /** `null` until onboarding completes; afterwards the persisted profile. */
  currentUser: UserProfile | null
  /** Replace the whole profile (used by onboarding submit). */
  setUser: (user: UserProfile) => void
  /** Patch any subset of fields (e.g. avatar swap, gem rewards). */
  updateUser: (patch: Partial<UserProfile>) => void
  /** Wipe the user back to `null` — re-triggers onboarding on next load. */
  clearUser: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

const STORAGE_KEY = 'lumina:user-profile:v1'

/**
 * Defensive parse — discards any malformed/legacy localStorage payload
 * rather than letting a stale schema crash the provider. Returns `null`
 * for "no valid user" so the router can route to onboarding.
 */
function loadUserFromStorage(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Record<string, unknown>
    if (typeof p.name !== 'string' || p.name.trim().length === 0) return null
    if (typeof p.avatar !== 'string' || p.avatar.length === 0) return null
    return {
      name: p.name,
      avatar: p.avatar,
      age: typeof p.age === 'number' ? p.age : undefined,
      gems: typeof p.gems === 'number' ? p.gems : 0,
    }
  } catch {
    return null
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  // Lazy initializer reads localStorage exactly once on mount; subsequent
  // renders just use the in-memory state.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    () => loadUserFromStorage(),
  )

  // Keep localStorage in sync with state. Writing `null` removes the key
  // so a `clearUser()` truly resets — next load returns `null` and the
  // router re-routes to onboarding.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (currentUser) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Quota exceeded / privacy mode — silently ignore. The in-memory
      // state still works for the current session.
    }
  }, [currentUser])

  const setUser = useCallback((user: UserProfile) => {
    setCurrentUser({
      ...user,
      name: user.name.trim(),
      gems: typeof user.gems === 'number' ? user.gems : 0,
    })
  }, [])

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const clearUser = useCallback(() => setCurrentUser(null), [])

  const value = useMemo<UserContextValue>(
    () => ({ currentUser, setUser, updateUser, clearUser }),
    [currentUser, setUser, updateUser, clearUser],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

/**
 * Primary consumer hook. Throws when used outside `<UserProvider>` so
 * mistakes surface loudly in dev rather than as a silent `null` deref.
 */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser() must be used inside <UserProvider>')
  }
  return ctx
}
