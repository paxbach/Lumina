# Lumina ✨

Cozy, pastel learning prototype for kids — tablet-first.

> Art direction: nhẹ Disney + Animal Crossing + sách tranh trẻ em. Pastel
> peach / mint / butter / lavender / sky, font **Fredoka** chunky, animation
> mềm bằng Framer Motion.

## Tech stack

| Layer        | Choice                            |
|--------------|-----------------------------------|
| Build        | Vite + React 19 + TypeScript      |
| Styles       | TailwindCSS v4 (CSS-first theme)  |
| Animation    | Framer Motion                     |
| Icons        | Lucide React                      |
| Routing      | React Router v6                   |
| State        | Zustand (with `persist`)          |
| Utils        | clsx + tailwind-merge (`cn`)      |

## Scripts

```bash
npm install
npm run dev       # dev server @ http://localhost:5173
npm run build     # tsc -b + vite build
npm run preview   # serve dist/
npm run lint
```

## Folder structure

```
src/
├── components/
│   ├── ui/             ← Button, Card, IconButton, ProgressBar, StarBadge
│   ├── layout/         ← AppShell (bottom tab bar), PageLayout
│   └── lessons/        ← LessonCard
├── pages/              ← HomePage, LessonsPage, LessonDetailPage, ProfilePage, NotFoundPage
├── router/             ← AppRouter (lazy routes + Suspense)
├── store/              ← useAppStore (Zustand + persist)
├── hooks/              ← useSound (placeholder)
├── utils/              ← cn (Tailwind merge), motion (variants & springs)
├── types/              ← shared TS types
├── App.tsx
├── main.tsx
└── index.css           ← Tailwind v4 @theme tokens + base layer
```

## Theme tokens

All design tokens live in `src/index.css` under `@theme { … }`. Edit there
and they instantly become Tailwind utilities (`bg-peach-100`, `text-cocoa-800`,
`shadow-soft`, `font-display`, `animate-float`, …).

Pastel palette: `peach`, `mint`, `butter`, `lavender`, `sky-cozy`
Neutrals: `cream-*`, `cocoa-*` (warm text colors instead of cold gray)
Radii: chunky (`rounded-3xl` everywhere) for child-friendly UI

## Path alias

Use `@/` for imports from `src/`:

```ts
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/useAppStore'
```

## Component conventions

- All interactive elements wrap with **Framer Motion** for soft tap/hover (see `tapPop`, `springSoft` in `utils/motion.ts`).
- Buttons & cards take a `tone` prop (`peach | mint | butter | lavender | sky`) — pick by context, not by importance.
- Icons are **Lucide React**, sized via `size-N` utility on parent or `[&_svg]:size-N` on the wrapper.
- Vietnamese copy by default — `lang="vi"` in `index.html`.

## Next steps

- Wire real audio in `hooks/useSound.ts` (Howler.js recommended).
- Replace emoji avatars with illustrated SVGs in `public/`.
- Add lesson content schema + per-lesson mini-games.
