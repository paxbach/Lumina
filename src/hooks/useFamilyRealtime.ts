import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useFamilyStore,
  rowToFamily,
  rowToMember,
  rowToQuest,
  rowToActivity,
  rowToReward,
  rowToMoment,
} from '@/store/useFamilyStore'
import type { OnlinePresence } from '@/types/family'

const DEV = import.meta.env.DEV
const log = (msg: string, data?: unknown) => {
  if (DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[lumina/realtime] ${msg}`, data ?? '')
  }
}

/**
 * useFamilyRealtime — Enhanced Supabase Realtime orchestrator
 *
 * Features:
 *   1. postgres_changes for INSERT/UPDATE on all family tables
 *   2. Presence tracking (join/leave/sync)
 *   3. Deduplication to prevent duplicate activities/moments
 *   4. Fallback reconciliation every 30s if realtime lags
 *   5. Robust error handling + logging
 *   6. Optimistic update support
 */
export function useFamilyRealtime(): void {
  const familyId = useFamilyStore((s) => s.family?.id ?? null)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)

  useEffect(() => {
    if (!familyId) return

    useFamilyStore.getState()._setStatus('connecting')
    let disposed = false
    let reconcileTimer: ReturnType<typeof setInterval> | null = null

    /* ─── Deduplication helpers ─────────────────────────────────── */
    const seenActivityIds = new Set<string>()
    const seenMomentIds = new Set<string>()

    const hasSeen = (type: 'activity' | 'moment', id: string) => {
      const set = type === 'activity' ? seenActivityIds : seenMomentIds
      if (set.has(id)) return true
      set.add(id)
      return false
    }

    /* ─── Initial snapshot ──────────────────────────────────────── */
    void (async () => {
      try {
        log('Fetching initial snapshot...')
        const [famRes, membersRes, questRes, actsRes, rewardsRes, momentsRes] = await Promise.all([
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
          supabase
            .from('family_moments')
            .select('*')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false })
            .limit(200),
        ])

        if (disposed) return

        const s = useFamilyStore.getState()
        if (famRes.data) s._setFamily(rowToFamily(famRes.data))
        if (membersRes.data) s._setMembers(membersRes.data.map(rowToMember))
        s._setQuest(questRes.data?.[0] ? rowToQuest(questRes.data[0]) : null)

        if (actsRes.data) {
          const acts = actsRes.data.map(rowToActivity)
          s._setActivities(acts)
          acts.forEach((a) => seenActivityIds.add(a.id))
        }

        if (rewardsRes.data) s._setRewards(rewardsRes.data.map(rowToReward))

        if (momentsRes.data) {
          const moms = momentsRes.data.map(rowToMoment)
          s._setMoments(moms)
          moms.forEach((m) => seenMomentIds.add(m.id))
        }

        log('Snapshot loaded', { activities: actsRes.data?.length, moments: momentsRes.data?.length })
      } catch (err) {
        log('Snapshot error', err)
      }
    })()

    /* ─── Channel setup ────────────────────────────────────────── */
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

    /* ─── postgres_changes ─────────────────────────────────────── */
    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            log('families UPDATE', p.new)
            useFamilyStore.getState()._setFamily(rowToFamily(p.new as never))
          } catch (err) {
            log('families handler error', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            log('family_members INSERT', p.new)
            useFamilyStore.getState()._appendMember(rowToMember(p.new as never))
          } catch (err) {
            log('family_members handler error', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_quests', filter: `family_id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            log('family_quests change', { event: p.eventType, new: p.new })
            useFamilyStore.getState()._setQuest(rowToQuest(p.new as never))
          } catch (err) {
            log('family_quests handler error', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_activities', filter: `family_id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            const actId = (p.new as { id: string }).id
            if (hasSeen('activity', actId)) {
              log('Skipping duplicate activity', actId)
              return
            }
            log('family_activities INSERT', p.new)
            useFamilyStore.getState()._appendActivity(rowToActivity(p.new as never))
          } catch (err) {
            log('family_activities handler error', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_rewards', filter: `family_id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            log('family_rewards INSERT', p.new)
            useFamilyStore.getState()._appendReward(rowToReward(p.new as never))
          } catch (err) {
            log('family_rewards handler error', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_moments', filter: `family_id=eq.${familyId}` },
        (p) => {
          try {
            if (!p.new) return
            const momId = (p.new as { id: string }).id
            if (hasSeen('moment', momId)) {
              log('Skipping duplicate moment', momId)
              return
            }
            log('family_moments INSERT', p.new)
            useFamilyStore.getState()._prependMoment(rowToMoment(p.new as never))
          } catch (err) {
            log('family_moments handler error', err)
          }
        },
      )

    /* ─── Presence (sync + join + leave) ────────────────────────── */
    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState<OnlinePresence>()
          const next: Record<string, OnlinePresence> = {}
          for (const instances of Object.values(state)) {
            const first = (instances as unknown as OnlinePresence[])[0]
            if (first?.memberId) {
              next[first.memberId] = first
            }
          }
          log('presence sync', Object.keys(next))
          useFamilyStore.getState()._setPresence(next)
        } catch (err) {
          log('presence sync error', err)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        try {
          for (const raw of newPresences) {
            const p = raw as unknown as OnlinePresence
            if (p?.memberId) {
              log('presence join', { memberId: p.memberId, displayName: p.displayName })
              useFamilyStore.getState()._addOnlinePresence(p)
            }
          }
        } catch (err) {
          log('presence join error', err)
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        try {
          for (const raw of leftPresences) {
            const p = raw as unknown as OnlinePresence
            if (p?.memberId) {
              log('presence leave', p.memberId)
              useFamilyStore.getState()._removeOnlinePresence(p.memberId)
            }
          }
        } catch (err) {
          log('presence leave error', err)
        }
      })

    /* ─── Subscribe + Track ────────────────────────────────────── */
    channel.subscribe(async (status) => {
      if (disposed) return
      log('channel status', status)

      if (status === 'SUBSCRIBED') {
        useFamilyStore.getState()._setStatus('connected')

        if (currentMemberId) {
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
            try {
              await channel.track(payload)
              log('tracked presence', payload.memberId)
            } catch (err) {
              log('track error', err)
            }
          }

          try {
            await supabase.rpc('update_member_last_seen', {
              p_member_id: currentMemberId,
            })
          } catch (err) {
            log('update_member_last_seen error', err)
          }
        }

        /* Start fallback reconciliation timer */
        if (!reconcileTimer) {
          reconcileTimer = setInterval(async () => {
            if (disposed) return
            try {
              log('Reconciling family state (fallback)...')
              const [actsRes, momentsRes, questRes] = await Promise.all([
                supabase
                  .from('family_activities')
                  .select('*')
                  .eq('family_id', familyId)
                  .order('created_at', { ascending: false })
                  .limit(60),
                supabase
                  .from('family_moments')
                  .select('*')
                  .eq('family_id', familyId)
                  .order('created_at', { ascending: false })
                  .limit(200),
                supabase
                  .from('family_quests')
                  .select('*')
                  .eq('family_id', familyId)
                  .eq('status', 'active')
                  .limit(1),
              ])

              if (disposed) return

              const s = useFamilyStore.getState()
              const currentActivities = s.activities

              if (actsRes.data && actsRes.data.length > 0) {
                const newActs = actsRes.data.map(rowToActivity)
                const missing = newActs.filter((a) => !currentActivities.some((ca) => ca.id === a.id))
                if (missing.length > 0) {
                  log('Reconcile: found missing activities', missing.length)
                  missing.forEach((m) => {
                    s._appendActivity(m)
                    seenActivityIds.add(m.id)
                  })
                }
              }

              if (momentsRes.data && momentsRes.data.length > 0) {
                const newMoms = momentsRes.data.map(rowToMoment)
                const currentMoments = s.moments
                const missing = newMoms.filter((m) => !currentMoments.some((cm) => cm.id === m.id))
                if (missing.length > 0) {
                  log('Reconcile: found missing moments', missing.length)
                  missing.forEach((m) => {
                    s._prependMoment(m)
                    seenMomentIds.add(m.id)
                  })
                }
              }

              if (questRes.data?.[0]) {
                const currentQuest = s.quest
                const newQuest = rowToQuest(questRes.data[0])
                if (!currentQuest || currentQuest.id !== newQuest.id || currentQuest.tasks !== newQuest.tasks) {
                  log('Reconcile: quest changed', newQuest.id)
                  s._setQuest(newQuest)
                }
              }
            } catch (err) {
              log('Reconciliation error', err)
            }
          }, 30_000)
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        useFamilyStore.getState()._setStatus('error')
      }
    })

    return () => {
      disposed = true
      if (reconcileTimer) {
        clearInterval(reconcileTimer)
      }
      try {
        void channel.untrack()
      } catch {
        /* ignore */
      }
      supabase.removeChannel(channel)
      useFamilyStore.getState()._setPresence({})
      useFamilyStore.getState()._setStatus('idle')
      log('Realtime cleanup complete')
    }
  }, [familyId, currentMemberId])
}
