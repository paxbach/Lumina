import type { PastelTone } from '@/types'

/**
 * NPC Friends — characters who appear throughout Lumina to greet, hint,
 * and guide. Each NPC has a stable identity (name, role, vibe) and a
 * tonal color that drives bubble/portrait styling.
 */
export interface NPC {
  id: string
  /** Short display name shown under the portrait. */
  name: string
  /** One-line role/title that hints at the NPC's domain. */
  role: string
  /** Avatar emoji rendered inside the portrait frame. */
  emoji: string
  tone: PastelTone
}

export const NPCS: Record<string, NPC> = {
  'gau-bac-hoc': {
    id: 'gau-bac-hoc',
    name: 'Bác Gấu Bác Học',
    role: 'Người Kể Chuyện Rừng',
    emoji: '🐻',
    tone: 'lavender',
  },
  'chim-se': {
    id: 'chim-se',
    name: 'Chị Chim Sẻ',
    role: 'Người Dẫn Đường',
    emoji: '🐦',
    tone: 'sky',
  },
  'cao-ke-chuyen': {
    id: 'cao-ke-chuyen',
    name: 'Cô Cáo Kể Chuyện',
    role: 'Người Mang Câu Chuyện Mới',
    emoji: '🦊',
    tone: 'peach',
  },
  'soc-vui-ve': {
    id: 'soc-vui-ve',
    name: 'Anh Sóc Vui Vẻ',
    role: 'Bạn Của Các Trò Chơi',
    emoji: '🐿️',
    tone: 'butter',
  },
  'rua-yen-tinh': {
    id: 'rua-yen-tinh',
    name: 'Bà Rùa Yên Tĩnh',
    role: 'Người Gìn Giữ Gia Đình',
    emoji: '🐢',
    tone: 'mint',
  },
}

export interface NPCGreeting {
  /** ID of the NPC delivering this greeting. */
  npc: string
  /** Multi-sentence message — the typewriter will pace punctuation. */
  message: string
  /** Optional call-to-action attached to the greeting. */
  cta?: {
    label: string
    /** React Router path to navigate to when CTA is tapped. */
    route: string
  }
}

/**
 * Rotating pool of daily greetings. The home page picks one based on the
 * day-of-year so the same NPC + message appears all day, then changes.
 */
export const DAILY_GREETINGS: NPCGreeting[] = [
  {
    npc: 'cao-ke-chuyen',
    message:
      'Chào bé yêu! Hôm nay chúng ta cùng giúp ba mẹ nhặt rau nhé — Cô Cáo nghe nói trong giỏ rau có một bí mật ngon lành đang chờ bé!',
    cta: { label: 'Vào bếp cùng mẹ', route: '/quests/festival-ingredient' },
  },
  {
    npc: 'gau-bac-hoc',
    message:
      'Sssh… Bác Gấu vừa đọc trong sách cổ: hôm nay có chiếc lá phong đỏ rơi đâu đó trong rừng. Bé giúp Bác đi tìm nhé?',
    cta: { label: 'Đi tìm lá đỏ', route: '/quests/red-leaf' },
  },
  {
    npc: 'chim-se',
    message:
      'Sương sớm tan rồi! Chị Chim Sẻ vừa bay qua Đảo Văn Hoá — có gì đó lung linh đang chờ bé khám phá ở đó!',
    cta: { label: 'Mở bản đồ', route: '/map' },
  },
  {
    npc: 'soc-vui-ve',
    message:
      'Hôm nay trời đẹp lắm! Anh Sóc đã giấu một chùm hạt dẻ trong mini-game ghép lá — bé thử đi tìm xem!',
    cta: { label: 'Chơi ghép lá', route: '/games/leaf-match' },
  },
  {
    npc: 'rua-yen-tinh',
    message:
      'Bà Rùa thấy gia đình bé tuần này thật ấm áp. Hôm nay bé hãy chia sẻ một kỷ niệm đẹp với ông bà nhé?',
    cta: { label: 'Mở sổ lưu niệm', route: '/family' },
  },
  {
    npc: 'gau-bac-hoc',
    message:
      'Bác Gấu vừa tìm thấy một câu đố cũ: "Vì sao lá đổi màu?" Bé có muốn cùng Bác khám phá không?',
    cta: { label: 'Khám phá Rừng Kỳ Diệu', route: '/map' },
  },
  {
    npc: 'chim-se',
    message:
      'Chị Chim Sẻ vừa bay qua Thành Phố Thông Minh — đèn đường còn chớp tắt lắm! Bé cùng ba mẹ ra phố giúp một tay nha?',
    cta: { label: 'Bắt đầu nhiệm vụ', route: '/quests/find-way-home' },
  },
]

/**
 * Pick a stable greeting for the day. Same NPC + message all day, rotates
 * at midnight local time.
 */
export function pickDailyGreeting(date: Date = new Date()): NPCGreeting {
  const startOfYear = new Date(date.getFullYear(), 0, 0)
  const diffMs = date.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diffMs / 86_400_000)
  return DAILY_GREETINGS[dayOfYear % DAILY_GREETINGS.length]
}

export function getNPC(id: string): NPC | undefined {
  return NPCS[id]
}
