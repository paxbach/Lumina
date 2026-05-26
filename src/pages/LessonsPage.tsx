import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { LessonCard } from '@/components/lessons/LessonCard'
import { useAppStore } from '@/store/useAppStore'
import { staggerContainer } from '@/utils/motion'

export default function LessonsPage() {
  const navigate = useNavigate()
  const lessons = useAppStore((s) => s.lessons)

  return (
    <PageLayout
      header={
        <div>
          <p className="text-xs uppercase tracking-widest text-lavender-500 font-semibold">
            Thư viện
          </p>
          <h1 className="text-2xl font-display font-semibold">Tất cả bài học</h1>
        </div>
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onOpen={(id) => navigate(`/lessons/${id}`)}
          />
        ))}
      </motion.div>
    </PageLayout>
  )
}
