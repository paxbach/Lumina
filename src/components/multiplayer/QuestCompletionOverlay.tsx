import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFamilyStore } from '@/store/useFamilyStore'
import { springBouncy } from '@/utils/motion'

/**
 * Celebration overlay. Fires once when the quest flips from active →
 * completed during the lifetime of this tab. We track the seen quest
 * ids in local state so re-opening the dashboard later doesn't replay
 * the celebration.
 */
export function QuestCompletionOverlay() {
  const quest = useFamilyStore((s) => s.quest)
  const family = useFamilyStore((s) => s.family)
  const [seenQuestIds, setSeenQuestIds] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!quest) return
    if (quest.status !== 'completed') return
    if (seenQuestIds.has(quest.id)) return
    setVisible(true)
    setSeenQuestIds((prev) => new Set(prev).add(quest.id))
    const t = window.setTimeout(() => setVisible(false), 3_400)
    return () => window.clearTimeout(t)
  }, [quest, seenQuestIds])

  return (
    <AnimatePresence>
      {visible && quest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-cocoa-900/40 backdrop-blur-sm"
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={springBouncy}
            className="mx-6 max-w-md rounded-cozy border-4 border-butter-300 bg-cream-50 px-8 py-10 text-center shadow-soft"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-7xl"
            >
              🎉
            </motion.div>
            <h2 className="mt-4 font-display text-3xl text-cocoa-900">
              Cả nhà thắng lớn!
            </h2>
            <p className="mt-2 text-base text-cocoa-700">
              Gia đình <strong>{family?.familyName}</strong> đã hoàn thành{' '}
              <strong>"{quest.title}"</strong>
            </p>
            <div className="mt-4 flex justify-center gap-3 text-3xl">
              <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}>🏅</motion.span>
              <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}>⭐</motion.span>
              <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}>📷</motion.span>
            </div>
            <p className="mt-5 text-sm text-cocoa-700/70">
              (Bấm bất kỳ đâu để đóng)
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
