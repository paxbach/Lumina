---
name: special-region-maps
description: How the per-region "special 3D" sub-map components work and how to add/redesign one
metadata:
  type: project
---

Each World-Map region can have a bespoke visual sub-map component in `src/components/map/<Name>Map.tsx`, wired by an `if (region.id === '...')` branch inside `RegionSubMapView` in `src/pages/WorldMapPage.tsx` (each branch: back button, doneCount pill, eyebrow header, the map, footer line). Default regions fall through to the generic node renderer.

Convention every map follows: props `{ region, onNodeClick }`; root `div` `aspect-[4/3] w-full max-w-4xl rounded-[2.5rem] border-4 shadow-pop` + gradient bg; ambient emoji/SVG layers; a shared landmark sub-component that resolves the REAL `SubNode` via `region.subNodes.find(n => n.id === '<canonical-id>')` and calls `onNodeClick(node)` (preserves routing/unlock/progression). Animations use `framer-motion` + `springBouncy`/`staggerItem` from `@/utils/motion`.

Region → canonical node ids:
- `rung-ky-dieu` (EnchantedForestMap): rkd-forest-zoo-safari (hub), rkd-forest-leaf-scanner, rkd-forest-color-picker, rkd-forest-light-detector, rkd-forest-shape-match
- `dao-van-hoa` (CulturalIslandMap): dvh-sac-mau-tet (center), dvh-le-hoi, dvh-vu-dieu, dvh-lich-su
- `thanh-pho-thong-minh` (SmartCityMap): tptm-tim-duong (center), tptm-dem-toa-nha, tptm-color-mix
- `vuong-quoc-gia-dinh` (FamilyKingdomMap): vqgd-bua-com, vqgd-cau-chuyen, vqgd-cung-choi
- `nui-khoa-hoc` (ScienceMountainMap)

Gotcha: `SubNode` only carries `isCompleted` — there is NO per-node locked/current flag. So redesign specs asking for locked/current/completed states can only honestly render completed (green + check) vs not-done. "Current" can be derived as the first `!isCompleted` node (cosmetic gold glow only); "100% complete" as `subNodes.every(isCompleted)`. Don't fabricate a locked state. (Earlier CulturalIslandMap shipped with WRONG hardcoded ids that matched no store node, so all its landmarks silently rendered nothing — verify ids against the store when touching these.)
