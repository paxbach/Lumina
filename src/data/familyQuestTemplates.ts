import type { SharedQuest } from '@/types/family'

/**
 * Mock quest catalog — the MVP seeds ONE active quest per new family.
 * Templates are pure data; the store stamps `id`, `status`, timestamps.
 */

type QuestTemplate = Omit<SharedQuest, 'id' | 'status' | 'startedAt' | 'completedAt'>

export const NATURE_EXPLORER_TEMPLATE: QuestTemplate = {
  templateKey: 'nature-explorer',
  title: 'Nhà thám hiểm thiên nhiên',
  description:
    'Cùng cả nhà khám phá thế giới ngoài kia: nhặt lá, chụp ảnh con vật và ngắm hoàng hôn.',
  tasks: [
    { key: 'find-3-leaves', label: 'Tìm 3 chiếc lá',     emoji: '🍃', required: 3, progress: 0 },
    { key: 'photo-animal',  label: 'Chụp 1 con vật',     emoji: '🐾', required: 1, progress: 0 },
    { key: 'watch-sunset',  label: 'Ngắm hoàng hôn',     emoji: '🌅', required: 1, progress: 0 },
  ],
}

export const ALL_QUEST_TEMPLATES: QuestTemplate[] = [NATURE_EXPLORER_TEMPLATE]
