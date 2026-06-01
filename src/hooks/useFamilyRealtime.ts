import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useFamilyStore,
  rowToFamily,
  rowToMember,
  rowToQuest,
  rowToActivity,
  rowToReward,
} from '@/store/useFamilyStore'
import type { OnlinePresence } from '@/types/family'

/**
 * useFamilyRealtime
 * ─────────────────────────────────────────────────────────────────────
 * Single-channel Supabase Realtime orchestrator. Mounts on the Family
 * Dashboard and wires three event sources into the Zustand store:
 *
 *   1. postgres_changes — INSERT / UPDATE on families, family_members,
 *      family_quests, family_activities, family_rewards (all filtered by
 *      the active family_id). Drives the live data feed + reward shelf.
 *
 *   2. presence — sync / join / leave events on the channel itself.
 *      Each connected tab calls `channel.track({ memberId, … })` once;
 *      Supabase Realtime then broadcasts join / leave the instant a
 *      WebSocket connects or drops. No client heartbeat needed.
 *
 *   3. One-shot snapshot — initial SELECT for each table so the cache
 *      reconciles with truth before the first Realtime push.
 *
 * Lifecycle: re-runs when familyId or currentMemberId changes; tears
 * down the channel + clears local presence map on unmount.
 */
export function useFamilyRealtime(): void {
  const familyId = useFamilyStore((s) => s.family?.id ?? null)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)

  useEffect(() => {
    if (!familyId) return

    useFamilyStore.getState()._setStatus('connecting')
    let disposed = false

    /* ─── one-shot snapshot ───────────────────────────────────── */
    void (async () => {
      const [famRes, membersRes, questRes, actsRes, rewardsRes] = await Promise.all([
        supabase.from('families').select('*').eq('id', familyId).maybeSingle(),
        supabase
          .from('family_members')
          .select('*')
          .eq('family_id', familyId)
          .order('joined_at', { ascending: true }),
        supabase
          .from('family_quests')
          .select('*')
          .eq('family_id', familyId)
          .eq('status', 'active')
          .limit(1),
        supabase
          .from('family_activities')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('family_rewards')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false }),
      ])

      if (disposed) return
      const s = useFamilyStore.getState()
      if (famRes.data) s._setFamily(rowToFamily(famRes.data))
      if (membersRes.data) s._setMembers(membersRes.data.map(rowToMember))
      s._setQuest(questRes.data?.[0] ? rowToQuest(questRes.data[0]) : null)
      if (actsRes.data) s._setActivities(actsRes.data.map(rowToActivity))
      if (rewardsRes.data) s._setRewards(rewardsRes.data.map(rowToReward))
    })()

    /* ─── channel setup ───────────────────────────────────────── */
    // The presence key is what `presenceState()` is indexed by. Use the
    // member id directly so look-ups in the store match what the UI
    // already keys members by. Observer tabs (no member yet) get a
    // unique random key so they don't collide on the roster.
    const presenceKey =
      currentMemberId ??
      `observer-${
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10)
      }`

    const channel = supabase.channel(`family:${familyId}`, {
      config: {
        presence: { key: presenceKey },
        broadcast: { self: false },
      },
    })

    /* ─── postgres_changes (DB rows → store) ─────────────────── */
    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` },
        (p) => {
          if (!p.new) return
          useFamilyStore.getState()._setFamily(rowToFamily(p.new as never))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
        (p) => {
          if (!p.new) return
          useFamilyStore.getState()._appendMember(rowToMember(p.new as never))
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_quests', filter: `family_id=eq.${familyId}` },
        (p) => {
          if (!p.new) return
          useFamilyStore.getState()._setQuest(rowToQuest(p.new as never))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_activities', filter: `family_id=eq.${familyId}` },
        (p) => {
          if (!p.new) return
          if (import.meta.env.DEV) {
            // Diagnostic — confirms activity_feed is wired end-to-end.
            // Look for this line in DevTools when activities appear live.
            // eslint-disable-next-line no-console
            console.debug('[lumina/realtime] activity', p.new)
          }
          useFamilyStore.getState()._appendActivity(rowToActivity(p.new as never))
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_rewards', filter: `family_id=eq.${familyId}` },
        (p) => {
          if (!p.new) return
          useFamilyStore.getState()._appendReward(rowToReward(p.new as never))
        },
      )

    /* ─── presence (sync + join + leave) ─────────────────────── */
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlinePresence>()
        const next: Record<string, OnlinePresence> = {}
        for (const instances of Object.values(state)) {
          // Each `instances` is an array — a single member with N tabs
          // shows up N times; we only need the first so the roster is
          // one-row-per-member.
          const first = (instances as unknown as OnlinePresence[])[0]
          if (first?.memberId) {
            next[first.memberId] = first
          }
        }
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[lumina/realtime] presence sync', Object.keys(next))
        }
        useFamilyStore.getState()._setPresence(next)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const raw of newPresences) {
          const p = raw as unknown as OnlinePresence
          if (p?.memberId) {
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.debug('[lumina/realtime] presence join', p.memberId, p.displayName)
            }
            useFamilyStore.getState()._addOnlinePresence(p)
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const raw of leftPresences) {
          const p = raw as unknown as OnlinePresence
          if (p?.memberId) {
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.debug('[lumina/realtime] presence leave', p.memberId)
            }
            useFamilyStore.getState()._removeOnlinePresence(p.memberId)
          }
        }
      })

    /* ─── subscribe + track ──────────────────────────────────── */
    channel.subscribe(async (status) => {
      if (disposed) return
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[lumina/realtime] channel status', status)
      }
      if (status === 'SUBSCRIBED') {
        useFamilyStore.getState()._setStatus('connected')

        if (currentMemberId) {
          // Read the latest member row from the store so the tracked
          // payload is fully populated by the time we call track().
          const me = useFamilyStore
            .getState()
            .members.find((m) => m.id === currentMemberId)

          if (me) {
            const payload: OnlinePresence = {
              memberId: me.id,
              displayName: me.displayName,
              avatar: me.avatar,
              page: 'family-dashboard',
              lastSeen: new Date().toISOString(),
            }
            await channel.track(payload)
          }
          // Stamp durable last_seen once on connect. The durable column
          // lives in DB; the realtime dot lives in `presence` map.
          void supabase.rpc('update_member_last_seen', {
            p_member_id: currentMemberId,
          })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        useFamilyStore.getState()._setStatus('error')
      }
    })

    /* No heartbeat — Supabase Realtime drives presence via the live
       WebSocket. The channel emits 'leave' as soon as the WS closes;
       polling here would just add load without changing behaviour. */

    return () => {
      disposed = true
      // Best-effort untrack so peers see us go offline immediately,
      // rather than waiting for the WebSocket teardown to time out.
      try {
        void channel.untrack()
      } catch {
        /* ignore */
      }
      supabase.removeChannel(channel)
      // Clear our local presence map so a remount starts clean.
      useFamilyStore.getState()._setPresence({})
      useFamilyStore.getState()._setStatus('idle')
    }
  }, [familyId, currentMemberId])
}
