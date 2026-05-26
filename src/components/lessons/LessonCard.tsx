import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { staggerItem } from '@/utils/motion'
import type { Lesson } from '@/types'

interface LessonCardProps {
  lesson: Lesson
  onOpen?: (id: string) => void
}

export function LessonCard({ lesson, onOpen }: LessonCardProps) {
  return (
    <motion.div variants={staggerItem}>
      <Card
        tone={lesson.tone}
        interactive
        onClick={() => onOpen?.(lesson.id)}
        role="button"
        tabIndex={0}
        className="flex flex-col gap-4"
      >
        <div className="flex items-start gap-4">
          <motion.div
            className="grid size-16 place-items-center rounded-2xl bg-white/70 text-4xl shadow-inset-soft"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span aria-hidden>{lesson.emoji}</span>
          </motion.div>

          <div className="flex-1">
            <h3 className="text-xl font-display font-semibold text-cocoa-900">
              {lesson.title}
            </h3>
            <p className="mt-1 text-sm text-cocoa-700">{lesson.description}</p>
          </div>

          <ChevronRight className="size-5 text-cocoa-700/60" aria-hidden />
        </div>

        <ProgressBar value={lesson.progress} tone={lesson.tone} size="sm" />
      </Card>
    </motion.div>
  )
}
