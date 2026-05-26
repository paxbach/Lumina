import type { PastelTone } from '@/types'
import type { StoryBeat } from '@/components/quest/StoryScroll'

/**
 * Thematic minigame identifiers. Each quest binds to exactly one; the page
 * dispatches to the matching component. Keep the union narrow — it doubles
 * as a compile-time guard against forgetting to wire a new quest.
 */
export type QuestMinigameKind =
  | 'leaf-count'        // Rừng Kỳ Diệu — đếm lá đỏ
  | 'traffic-keypad'    // Thành Phố — nhớ số điện thoại + biển báo
  | 'mooncake-tray'     // Đảo Văn Hoá — sắp mâm cỗ Trung Thu
  | 'float-sink'        // Núi Khoa Học — vật nổi/chìm
  | 'bedtime-routine'   // Vương Quốc Gia Đình — thứ tự trước khi ngủ

export interface QuestDef {
  id: string
  chapter: string
  /** Gameified, adventure-style title. */
  title: string
  /** Subtitle used in lists. */
  tagline: string
  heroEmoji: string
  /** Subject the player is hunting (camera scene narration). */
  subject: string
  /** Mission objective stated as a goal. */
  objective: string
  /** Longer detail on the objective. */
  objectiveDetail: string
  /** Multi-beat story narrated by Lumi. */
  story: StoryBeat[]
  /** Mock location label for the mini-map. */
  location: string
  /** Mock distance label. */
  distance: string
  /**
   * Region this quest lives in — drives the regionId saved on every memory
   * entry and the thematic copy on the minigame CTA. Must match a region.id
   * defined in `defaultRegions` (src/store/useAppStore.ts).
   */
  regionId: string
  /** Short Vietnamese label for the region, used in CTAs ("rừng" / "thành phố" / …). */
  regionShortName: string
  /** Pastel tone matched to the region for tinting list cards / CTAs. */
  tone: PastelTone
  /** Which thematic minigame the quest's final stage renders. */
  minigameKind: QuestMinigameKind
  /** Discovery payload (shown after capture). */
  discovery: {
    itemName: string
    itemEmoji: string
    power: number
    story: string
    knowledgeHook: string
  }
  /** Reward block. */
  rewards: {
    crystals: number
    stars: number
    /** Forest revival amount, 0..1. */
    revival: number
  }
  /** Content unlocked on completion. */
  unlock?: {
    title: string
    description: string
    emoji: string
  }
  /** Teaser for the next chapter. */
  nextChapter?: string
}

export const QUESTS: QuestDef[] = [
  {
    id: 'red-leaf',
    chapter: 'Mùa Thu Mất Lửa',
    title: 'Cứu Ngọn Lửa Bé Nhỏ',
    tagline: 'Một chiếc lá đỏ có thể đổi mùa…',
    heroEmoji: '🍁',
    subject: 'chiếc lá đỏ',
    objective: 'Tìm và chụp chiếc lá đỏ ngoài đời thật',
    objectiveDetail:
      'Cùng bố mẹ ra ngoài, tìm chiếc lá đỏ rực rỡ nhất — chụp ảnh để mang ánh sáng của nó về Làng Ánh Sáng.',
    story: [
      { emoji: '🌬️', text: 'Sssh… bé có nghe thấy gì không? Cây Cổ Thụ vừa thì thầm với mình…' },
      { emoji: '🔥', text: '"Ngọn Lửa Bé Nhỏ trong Đèn Mùa Thu đang dần tắt…"' },
      { emoji: '🍂', text: 'Mỗi năm, ánh sáng ấm áp ấy được giữ trong một chiếc lá phong đỏ rực…' },
      { emoji: '⏳', text: 'Nhưng năm nay chiếc lá ấy chưa rơi — Ngọn Lửa sắp tắt mất rồi!' },
      { emoji: '✨', text: 'Chỉ có bé mới giúp được. Cùng Lumi đi tìm nhé?' },
    ],
    location: 'Bìa rừng phong',
    distance: '~5 phút đi bộ',
    regionId: 'rung-ky-dieu',
    regionShortName: 'rừng',
    tone: 'peach',
    minigameKind: 'leaf-count',
    discovery: {
      itemName: 'Lá Phong Đỏ Lửa',
      itemEmoji: '🍁',
      power: 5,
      story:
        'Đây là chiếc lá hiếm chỉ rơi vào những hoàng hôn mùa thu. Bé giữ nó cẩn thận — Cây Cổ Thụ sẽ ấm áp trở lại khi bé mang về Làng!',
      knowledgeHook: 'Vì sao lá đổi màu? — Hãy hỏi Cây Cổ Thụ Tri Thức.',
    },
    rewards: { crystals: 3, stars: 2, revival: 0.05 },
    unlock: {
      title: 'Hang Đom Đóm',
      description: 'Khu vực mới mở! Đếm những đốm sáng và học toán cùng đom đóm.',
      emoji: '✨',
    },
    nextChapter:
      'Nhưng Ngọn Lửa kia chỉ là một trong nhiều bí ẩn… Tiếng còi từ Hang Đom Đóm đang vọng tới.',
  },
  {
    id: 'festival-ingredient',
    chapter: 'Đêm Trăng Mờ Tối',
    title: 'Lễ Hội Ánh Sáng',
    tagline: 'Chú Cuội đang đợi ánh sáng từ mâm cỗ của mẹ…',
    heroEmoji: '🏮',
    subject: 'mâm cỗ Trung Thu',
    objective: 'Cùng mẹ chuẩn bị một mâm cỗ Trung Thu nhỏ',
    objectiveDetail:
      'Sương mù của Đảo Văn Hoá đang xoá nhoà ký ức về Tết Trung Thu. Cùng mẹ bày mâm cỗ — bưởi, hồng, bánh nướng, đèn lồng — chụp lại để dâng ánh sáng lên chú Cuội đang ngồi gốc cây đa trên cung trăng.',
    story: [
      { emoji: '🌙', text: 'Đêm Rằm tháng Tám đang đến gần — nhưng mặt trăng năm nay nhợt nhạt quá!' },
      { emoji: '🌳', text: 'Chú Cuội ngồi gốc cây đa, mỏi mắt chờ ánh sáng từ các bé nhỏ phía dưới…' },
      { emoji: '🥮', text: 'Sự tích kể: mỗi mâm cỗ trẻ con bày lên là một tia sáng vọng về cung trăng.' },
      { emoji: '🍊', text: 'Bưởi, hồng đỏ, bánh nướng, đèn lồng — Bếp Của Mẹ đủ cả đấy thôi!' },
      { emoji: '✨', text: 'Cùng mẹ bày mâm cỗ, chụp lại — Lumi sẽ gửi ánh sáng lên cho chú Cuội.' },
    ],
    location: 'Bếp Của Mẹ',
    distance: 'Ngay trong nhà',
    regionId: 'dao-van-hoa',
    regionShortName: 'lễ hội',
    tone: 'butter',
    minigameKind: 'mooncake-tray',
    discovery: {
      itemName: 'Bưởi Vàng Đêm Rằm',
      itemEmoji: '🍊',
      power: 5,
      story:
        'Quả bưởi vàng óng được mẹ tỉa thành con thỏ ngọc — chú Cuội mỉm cười nhìn xuống, mặt trăng sáng rực rỡ trở lại trên Đảo Văn Hoá!',
      knowledgeHook:
        'Mâm cỗ Trung Thu truyền thống có bưởi, hồng, bánh nướng, bánh dẻo và đèn lồng — mỗi món mang một ý nghĩa riêng của ông bà ta.',
    },
    rewards: { crystals: 5, stars: 3, revival: 0.08 },
    unlock: {
      title: 'Núi Khoa Học',
      description:
        'Ngọn núi tí hon mở cửa khi ánh sáng từ Đảo Văn Hoá đã đẩy lùi bóng tối.',
      emoji: '🗻',
    },
    nextChapter:
      'Trăng đã sáng — bé nghe thấy tiếng kính viễn vọng kêu tích tắc trên Núi Khoa Học…',
  },
  {
    id: 'find-way-home',
    chapter: 'Phố Vắng Biển Báo',
    title: 'Tìm Đường Về Nhà',
    tagline: 'Khi đèn đường tắt, ai sẽ chỉ lối cho bé?',
    heroEmoji: '🚸',
    subject: 'biển báo giao thông',
    objective: 'Cùng ba mẹ đi dạo, đọc biển báo và nhớ số điện thoại cứu hộ',
    objectiveDetail:
      'Khối Rubik Logic của Thành Phố Thông Minh đang mất năng lượng — đèn đường và biển báo chớp tắt mơ hồ. Cùng ba mẹ ra phố, chỉ vào từng biển báo bé thấy và chụp ảnh — Lumi sẽ giúp bé nhớ số điện thoại ba mẹ phòng khi lạc đường.',
    story: [
      { emoji: '🌃', text: 'Sssh… Thành Phố Thông Minh đang chớp tắt — đèn đường mỏi mệt quá rồi…' },
      { emoji: '🧩', text: 'Khối Rubik Logic — trái tim của thành phố — đang dần mất ánh sáng.' },
      { emoji: '🚸', text: 'Lumi nghe các biển báo thì thầm: "Bé ơi, ai dắt bé về nếu chúng tôi tắt?"' },
      { emoji: '📞', text: 'Nhớ số điện thoại của ba mẹ là chìa khoá — bé biết rồi đúng không?' },
      { emoji: '✨', text: 'Cùng ba mẹ ra phố nhé! Mỗi biển báo bé chụp sẽ thắp lại một ngọn đèn.' },
    ],
    location: 'Vỉa hè trước nhà',
    distance: '~10 phút đi bộ',
    regionId: 'thanh-pho-thong-minh',
    regionShortName: 'thành phố',
    tone: 'sky',
    minigameKind: 'traffic-keypad',
    discovery: {
      itemName: 'Biển Báo Ánh Sáng',
      itemEmoji: '🚸',
      power: 4,
      story:
        'Biển báo "Trẻ em qua đường" sáng lại rồi — bé đã giúp các bạn nhỏ khác đi học an toàn. Khối Rubik Logic gật gù vui vẻ.',
      knowledgeHook:
        'Số điện thoại cứu hộ ở Việt Nam: 113 (công an), 114 (cứu hoả), 115 (cấp cứu). Bé nhớ thêm số ba mẹ nhé!',
    },
    rewards: { crystals: 4, stars: 2, revival: 0.06 },
    unlock: {
      title: 'Đảo Văn Hoá',
      description:
        'Hòn đảo của lễ hội và phong tục — sương mù đã loãng dần khi thành phố sáng lại.',
      emoji: '🏝️',
    },
    nextChapter:
      'Khi thành phố lung linh trở lại, bé sẽ thấy con thuyền nhỏ chờ đưa bé ra Đảo Văn Hoá…',
  },
  {
    id: 'star-journey',
    chapter: 'Trọng Lực Đảo Ngược',
    title: 'Hành Trình Sao Băng',
    tagline: 'Vật nổi hay chìm? Khoa học sẽ trả lời…',
    heroEmoji: '🌠',
    subject: 'thí nghiệm vật nổi chìm',
    objective: 'Làm thí nghiệm "Vật nổi hay chìm?" với một chậu nước',
    objectiveDetail:
      'Trên Núi Khoa Học, trọng lực đang lộn ngược — bút chì rơi lên trời! Cùng ba mẹ chuẩn bị một chậu nước, thả thìa, nắp chai, cục tẩy vào, đoán cái nào nổi cái nào chìm rồi chụp ảnh.',
    story: [
      { emoji: '⚖️', text: 'Sssh… có gì đó kỳ lạ trên Núi Khoa Học — sao bút chì của Lumi cứ rơi lên trên?' },
      { emoji: '🌠', text: 'Sao Băng Nhỏ của núi đang rớt mảnh — định luật vật lý xáo trộn hết rồi!' },
      { emoji: '🪣', text: 'Bé giúp được — chỉ cần một chậu nước và vài món đồ quen thuộc thôi.' },
      { emoji: '🥄', text: 'Thử thả thìa, nắp chai, cục tẩy: bé đoán xem cái nào nổi, cái nào chìm?' },
      { emoji: '✨', text: 'Mỗi câu trả lời đúng sẽ giúp một mảnh sao băng tìm lại đúng quỹ đạo!' },
    ],
    location: 'Bồn rửa của bé',
    distance: 'Ngay trong nhà',
    regionId: 'nui-khoa-hoc',
    regionShortName: 'phòng thí nghiệm',
    tone: 'lavender',
    minigameKind: 'float-sink',
    discovery: {
      itemName: 'Mảnh Sao Băng',
      itemEmoji: '🌠',
      power: 5,
      story:
        'Cục tẩy chìm, nắp chai nổi — vật nặng hơn nước thì chìm, nhẹ hơn thì nổi. Sao Băng Nhỏ ghép lại được rồi!',
      knowledgeHook:
        'Bí mật của lực đẩy Ác-si-mét: nước đẩy lên đúng bằng trọng lượng phần nước bị vật chiếm chỗ.',
    },
    rewards: { crystals: 5, stars: 3, revival: 0.08 },
    unlock: {
      title: 'Vương Quốc Gia Đình',
      description:
        'Trái tim ấm áp của Lumina mở cửa khi bé đã hiểu cả khoa học lẫn phép màu.',
      emoji: '💖',
    },
    nextChapter:
      'Núi sáng lại rồi — Vương Quốc Gia Đình đang gọi bé về với cái ôm ấm nhất…',
  },
  {
    id: 'bedtime-story',
    chapter: 'Trang Sách Cuối Ngày',
    title: 'Câu Chuyện Trước Khi Ngủ',
    tagline: 'Một cái ôm trước khi ngủ là phép màu lớn nhất…',
    heroEmoji: '🌙',
    subject: 'kỷ niệm gia đình',
    objective: 'Ôm chúc ngủ ngon ba mẹ và hỏi ông bà về một kỷ niệm ngày xưa',
    objectiveDetail:
      'Đêm xuống trong Vương Quốc Gia Đình. Trước khi đi ngủ, bé chạy đến ôm ba mẹ, xin ông bà kể một câu chuyện ngày xưa, rồi chụp một tấm ảnh ấm áp — Lumi sẽ lưu vào Album Dòng Thời Gian Trưởng Thành.',
    story: [
      { emoji: '🌙', text: 'Đêm khuya tới rồi — Vương Quốc Gia Đình thắp đèn ngủ nho nhỏ.' },
      { emoji: '🫂', text: 'Lumi thì thầm: "Một cái ôm trước khi ngủ chứa cả ngàn phép màu đó."' },
      { emoji: '👵', text: '"Bà ơi, hồi nhỏ bà chơi trò gì?" — câu hỏi đơn giản, mắt bà sẽ lấp lánh ngay!' },
      { emoji: '📖', text: 'Mỗi kỷ niệm xưa của ông bà là một trang sách Lumi giữ giùm bé.' },
      { emoji: '📸', text: 'Chụp một tấm ảnh cả nhà cùng cười nhé — Lumi sẽ cất vào Album Dòng Thời Gian.' },
    ],
    location: 'Phòng khách / phòng ngủ',
    distance: 'Ngay trong nhà',
    regionId: 'vuong-quoc-gia-dinh',
    regionShortName: 'phòng ngủ ấm',
    tone: 'peach',
    minigameKind: 'bedtime-routine',
    discovery: {
      itemName: 'Trang Ký Ức Ấm',
      itemEmoji: '📖',
      power: 5,
      story:
        'Trang ký ức mới mở ra — có nụ cười của ông bà, có cái ôm của ba mẹ, có cả tiếng cười khúc khích của bé. Vương Quốc Gia Đình rực rỡ ánh ấm.',
      knowledgeHook:
        'Hỏi người lớn về kỷ niệm xưa là cách kết nối nhanh nhất giữa các thế hệ — đừng ngại nhé!',
    },
    rewards: { crystals: 6, stars: 4, revival: 0.1 },
    nextChapter:
      'Khi cả 5 vùng đã rực rỡ, Lumi sẽ kể bé nghe bí mật cuối cùng của Rừng Kỳ Diệu…',
  },
]
