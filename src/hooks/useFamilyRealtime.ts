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

/**
 * useFamilyRealtime
 * ─────────────────────────────────────────────────────────────────────
 * Mount-once-per-dashboard hook. Subscribes the active tab to a single
 * Supabase Realtime channel `family:{familyId}` that fans in:
 *
 *   • postgres_changes — INSERT/UPDATE on families / members / quests /
 *     activities / rewards filtered by family_id.
 *   • presence — every connected tab `track()`s its `currentMemberId`,
 *     and a 'sync' event rebuilds the online map in the store.
 *
 * Lifecycle:
 *   • On mount, refetches a one-shot snapshot for every table so the
 *     persisted localStorage cache reconciles with truth before the
 *     first Realtime push.
 *   • On unmount (or familyId change), removes the channel.
 *
 * Heartbeats:
 *   Supabase auto-pings the websocket; we re-`track()` ourselves every
 *   PRESENCE_TICK_MS so the dot decays cleanly on the other tab if our
 *   tab crashes mid-session.
 */

const PRESENCE_TICK_MS = 4_000

export function useFamilyRealtime(): void {
  const familyId = useFamilyStore((s) => s.family?.id ?? null)
  const currentMemberId = useFamilyStore((s) => s.currentMemberId)

  useEffect(() => {
    if (!familyId) return

    const store = useFamilyStore.getState()
    store._setStatus('connecting')

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

    /* ─── live channel ────────────────────────────────────────── */
    const channel = supabase.channel(`family:${familyId}`, {
      config: {
        presence: { key: currentMemberId ?? `observer-${Math.random().toString(36).slice(2, 8)}` },
        broadcast: { self: false },
      },
    })

    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` },
        (p) => p.new && useFamilyStore.getState()._setFamily(rowToFamily(p.new as never)),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
        (p) => p.new && useFamilyStore.getState()._appendMember(rowToMember(p.new as never)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_quests', filter: `family_id=eq.${familyId}` },
        (p) => p.new && useFamilyStore.getState()._setQuest(rowToQuest(p.new as never)),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_activities', filter: `family_id=eq.${familyId}` },
        (p) => p.new && useFamilyStore.getState()._appendActivity(rowToActivity(p.new as never)),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_rewards', filter: `family_id=eq.${familyId}` },
        (p) => p.new && useFamilyStore.getState()._appendReward(rowToReward(p.new as never)),
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const now = Date.now()
        const next: Record<string, number> = {}
        // Each key in presenceState is the `presence.key` we passed at
        // channel construction (i.e. currentMemberId for joined members,
        // or `observer-XXX` for tabs that haven't joined yet).
        for (const key of Object.keys(state)) {
          next[key] = now
        }
        useFamilyStore.getState()._setPresence(next)
      })
      .subscribe(async (status) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          useFamilyStore.getState()._setStatus('connected')
          if (currentMemberId) {
            await channel.track({
              memberId: currentMemberId,
              online_at: new Date().toISOString(),
            })
            // Stamp the durable last_seen on first connect so anyone
            // querying the DB sees us as freshly active.
            void supabase.rpc('update_member_last_seen', {
              p_member_id: currentMemberId,
            })
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          useFamilyStore.getState()._setStatus('error')
        }
      })

    /* ─── presence heartbeat ──────────────────────────────────── */
    const heartbeat = window.setInterval(() => {
      if (disposed || !currentMemberId) return
      // (1) Re-track on the Realtime channel — refreshes our presence
      // row for tabs currently subscribed.
      void channel.track({
        memberId: currentMemberId,
        online_at: new Date().toISOString(),
      })
      // (2) Stamp `last_seen` in the DB via the dedicated RPC. Survives
      // tab close + powers "Vắng 5 phút trước"-style UI in the future.
      // Fire-and-forget: a missed ping is not a correctness issue.
      void supabase.rpc('update_member_last_seen', { p_member_id: currentMemberId })
    }, PRESENCE_TICK_MS)

    return () => {
      disposed = true
      window.clearInterval(heartbeat)
      supabase.removeChannel(channel)
      useFamilyStore.getState()._setStatus('idle')
    }
  }, [familyId, currentMemberId])
}
