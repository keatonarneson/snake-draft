# Draft Sim

A fantasy baseball **snake-draft assistant**. It runs a mock draft against configurable CPU opponents, ranks the available player pool in real time, tracks your roster and category needs, and projects final rotisserie standings — or you can flip to **live mode** to log the picks of a real draft as it happens.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- No runtime dependencies beyond React/Next; all draft logic is plain TypeScript
- ESLint (`next/core-web-vitals`, `next/typescript`)

> ⚠️ This repo pins a build of Next.js whose APIs and lint rules differ from the public release — see [`AGENTS.md`](AGENTS.md). Read the bundled docs under `node_modules/next/dist/docs/` before touching framework-level code. In particular, the `react-hooks` lint rules are stricter than usual (no ref writes during render, no `setState` synchronously in effects, no impure calls in render).

## Getting started

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

There is no test runner configured yet.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next App Router shell (`layout.tsx`, `page.tsx`, `globals.css`). `page.tsx` just renders `DraftRoom`. |
| `src/features/draft-room/` | `DraftRoom` — the top-level client component that wires state, engine, and UI together. Owns draft config, persistence, and the CPU-pick loop. `useSandboxSettingsState` holds the algorithm-weight sliders. |
| `src/engine/` | Framework-agnostic draft logic (no React). Snake order, scoring, recommendations, scarcity, category needs, roster fitting, standings. Tunable constants live in `config.ts`. |
| `src/hooks/` | React state hooks: `useDraftState` (picks + cursor), `useProjectionLoader` (data), `usePersistedSnapshot` (localStorage), `useDraftTargets`, `usePlayerMap`. |
| `src/components/` | UI, grouped by area (`draft-board/`, `player-list/`, `dashboard-summary/`, `settings-panel/`, `roster-tracker/`) plus shared primitives in `ui/`. |
| `src/data/` | `projections.ts` — the single **data-loading boundary** (see below). |
| `src/utils/` | `csvParser.ts` and `sampleData.ts` (mock players). |
| `src/types/` | Shared `Player` / `PlayerStats` types. |
| `public/` | Projection CSVs consumed by the prototype loader. |

## Data layer

Player projections load through one boundary: **`loadProjectionDatasets()` in `src/data/projections.ts`**. Today it fetches CSVs from `public/` (OOPSY, Steamer, THE BAT hitters + pitchers) and blends them into consensus values; if none load it falls back to mock data from `sampleData.ts` (and the UI shows a "using sample data" banner).

The CSV loading is **prototype-only** — the intent is to swap `loadProjectionDatasets()` for a real API without touching the components or hooks that consume it. Keep new data-source code behind that function.

The core domain type every layer speaks in (`src/types/draft.ts`):

```ts
interface Player {
  id: string;
  name: string;
  team: string;
  positions: string[];        // e.g. ["OF", "UT"] or ["SP"]
  adp: number;                // average draft position
  minPick: number;            // draft-range floor / ceiling
  maxPick: number;
  value: number;              // blended $ value
  consensusValue?: number;    // cross-system consensus $
  maxSystemValue?: number;    // highest single-system $ (upside)
  stats: PlayerStats;         // R/HR/RBI/SB/AVG + IP/W/SV/SO/ERA/WHIP
  isPitcher: boolean;
}
```

Draft state (picks, cursor, settings, custom projections) is persisted to `localStorage` and offered for resume on reload; it is **not** synced to any backend.

## Scoring model

Two independent models share the engine's helper modules but are intentionally separate:

- **`getRecommendations`** (`recommendations.ts`) ranks the pool for *you*, blending value, category needs, positional scarcity, return probability, reach cost, and upside — tuned live by the sandbox sliders.
- **`calculateCpuScore`** (`cpuScoring.ts`) simulates *opponent* picks using per-team archetypes/profiles (market, projection, need, upside).

The scoring math is still being tuned — treat it as a work in progress, not a fixed spec.

## Roadmap / notes

- **Real projection API** will replace the CSV prototype (see the data-layer boundary above).
- **No auction-draft mode** is planned — snake only.
- A future rewrite targets **Pages Router + JavaScript/JSX** rather than App Router + TypeScript, so keep framework coupling shallow and logic in the (portable) `engine/`.
