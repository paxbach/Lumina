import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client singleton — used by the multiplayer family layer.
 *
 * Env vars (set in `.env.local` next to package.json):
 *   VITE_SUPABASE_URL       — https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY  — public anon key from Project Settings → API
 *
 * If either is missing we surface a loud console error AND throw at the
 * first `supabase.*` call site — better than a confusing 401 dance.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function makeMissingEnvProxy(): SupabaseClient {
  const message =
    'Supabase env vars missing. Copy .env.example to .env.local and set ' +
    'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, then restart `npm run dev`.'
  // eslint-disable-next-line no-console
  console.error('[lumina] ' + message)
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(message)
    },
  })
}

export const supabase: SupabaseClient =
  url && anonKey
    ? createClient(url, anonKey, {
        realtime: { params: { eventsPerSecond: 10 } },
        auth: {
          persistSession: false,   // we manage per-tab member id ourselves
          autoRefreshToken: false,
        },
      })
    : makeMissingEnvProxy()

export const hasSupabaseConfig = Boolean(url && anonKey)
