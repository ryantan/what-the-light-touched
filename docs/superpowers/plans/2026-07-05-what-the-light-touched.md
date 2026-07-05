# What the Light Touched — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete playable engine and placeholder-content build of *What the Light Touched*, a ~30-minute browser point-and-click horror game where the narration lies and noticing the lies is the game.

**Architecture:** Vanilla TypeScript on a canvas-free DOM stage — photos as layered `<img>`, hotspots as invisible SVG polygons, narration as styled DOM text. All content (rooms, hotspots, narration pairs, fractures, puzzles) lives in a single data file `public/game.json` interpreted by a small engine. A headless reachability simulator proves both endings reachable and all 7 fractures collectible, and runs as both a test and a CLI.

**Tech Stack:** TypeScript, Vite (build/dev server), Vitest + happy-dom (tests), tsx (CLI scripts). **Zero runtime dependencies.**

## Global Constraints

Copied from the spec — every task implicitly includes these:

- Stage is fixed 1280×720, letterboxed, scaled to fit the window.
- Zero runtime dependencies; ships as a static site (~15 MB budget with photos).
- Photo state changes are **400ms crossfades, never cuts**.
- **Examine** = first click (Mara's voice, typewriter text). **Look Again** = second click on the same hotspot while its text is still on screen (objective voice, instant text, hard audio silence).
- The objective ("Look Again") voice must **never** gain audio — Look Again always hard-silences the mix.
- 7 fractures total. A fracture registers silently when the player has seen **both** halves of a genuine contradiction. Environmental shifts fire at 3, 5, and 7 fractures.
- Ending B requires **≥ 5 fractures** plus clicking the misaligned word; Ending A is the default.
- Critical path (Ending A) must be completable by a player who registers **zero** fractures.
- Room unlock chain: Entry → Living Room → (answering machine) → Kitchen → (calendar puzzle) → Bathroom; Second Bedroom needs key ring **and** notebook read.
- Exactly 3 inventory items: key ring, Polaroid camera, notebook. Inventory UI hidden until the first item is found.
- Autosave on every room transition; no manual save UI.
- No fail states, no deaths, no jump scares, no pixel hunting (hold-space "breathe" highlight is the accessibility escape hatch).
- Hotspots are invisible polygons; the only affordance is a cursor change.
- Narration is text-only. All prose in this plan is **placeholder copy** — the real writing pass (human-authored contradiction ledger first) happens after the engine works, by editing `public/game.json` only.

## File Structure

```
v1/
├── index.html                      # stage shell
├── package.json / tsconfig.json / vite.config.ts
├── public/
│   ├── game.json                   # ALL content: rooms, hotspots, narration, fractures, puzzles, finale
│   └── photos/*.svg                # generated placeholder plates (later: real photos, same filenames)
├── src/
│   ├── main.ts                     # boot: load game.json, wire all systems
│   ├── app.ts                      # createStage(): letterboxed 1280×720 stage element
│   ├── style.css
│   ├── types.ts                    # GameData/Room/Hotspot/Condition/Effect — the content schema
│   ├── data/validate.ts            # validateGameData(): structural checks (shared by loader + CLI)
│   ├── state/store.ts              # flat flags/items/fractures store + subscribe
│   ├── state/persist.ts            # StorageAdapter: IndexedDB, memory fallback, save codes
│   ├── engine/stage.ts             # photo plates + 400ms crossfade
│   ├── engine/hotspots.ts          # SVG polygon layer, cursor, breathe mode
│   ├── engine/textbox.ts           # typewriter narration vs instant objective text
│   ├── engine/effects.ts           # Condition checker + Effect executor
│   ├── engine/fractures.ts         # fracture registration, tiers, threshold shifts
│   ├── engine/interactions.ts      # the Examine / Look Again two-click controller
│   ├── engine/rooms.ts             # navigation, exit locks, autosave hook
│   ├── engine/puzzles.ts           # flag-watching puzzle rules (calendar puzzle)
│   ├── engine/geometry.ts          # pointInPolygon
│   ├── engine/drag.ts              # notebook → UV glow drag (the game's only drag)
│   ├── engine/audio.ts             # room tones, motif detune tiers, hard silence
│   ├── engine/finale.ts            # Doubt Prompt, misaligned word, Endings A & B
│   ├── ui/inventory.ts             # 3 fixed slots
│   ├── ui/menu.ts                  # pause menu: volume, text speed, breathe toggle, content notes
│   └── tools/reachability.ts       # simulate(game): headless walkthrough prover
├── tools/
│   ├── validate.ts                 # CLI: schema + reachability over public/game.json
│   └── gen-placeholders.mjs        # writes placeholder photo plates
└── tests/                          # vitest specs, one per module
```

Task order = dependency order. Tasks 1–10 produce the Week-1 vertical slice (Examine/Look Again loop working in two rooms); Tasks 11–20 complete the game.

---

### Task 1: Project scaffold + letterboxed stage

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`, `src/style.css`, `src/app.ts`, `src/main.ts`
- Test: `tests/app.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `createStage(root: HTMLElement): HTMLElement` from `src/app.ts` — returns the 1280×720 `#stage` element every later system mounts into.

- [ ] **Step 1: Init repo and npm project**

```bash
cd /Users/ryantan/projects/games/what-the-light-touched/v1
git init
```

Create `package.json`:

```json
{
  "name": "what-the-light-touched",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "validate": "tsx tools/validate.ts",
    "check": "npm run typecheck && npm run test && npm run validate"
  }
}
```

```bash
npm install -D typescript vite vitest happy-dom tsx
```

- [ ] **Step 2: Config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "tools"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
} as any)
```

`.gitignore`:

```
node_modules/
dist/
release.zip
```

- [ ] **Step 3: Write the failing test**

`tests/app.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createStage } from '../src/app'

describe('createStage', () => {
  it('mounts a 1280x720 stage inside a centering frame', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const stage = createStage(root)
    expect(stage.id).toBe('stage')
    expect(stage.style.width).toBe('1280px')
    expect(stage.style.height).toBe('720px')
    expect(root.querySelector('#frame')?.contains(stage)).toBe(true)
  })

  it('scales the stage to fit the window', () => {
    const root = document.createElement('div')
    const stage = createStage(root)
    // happy-dom default window is 1024x768 → scale = 1024/1280 = 0.8
    expect(stage.style.transform).toContain('scale(0.8')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/app.test.ts`
Expected: FAIL — cannot resolve `../src/app`.

- [ ] **Step 5: Implement**

`src/style.css`:

```css
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
#frame { position: fixed; inset: 0; display: grid; place-items: center; }
#stage {
  position: relative; background: #101010; overflow: hidden;
  transform-origin: center center;
  font-family: Georgia, 'Times New Roman', serif;
  user-select: none;
}
```

`src/app.ts`:

```ts
export const STAGE_W = 1280
export const STAGE_H = 720

export function createStage(root: HTMLElement): HTMLElement {
  const frame = document.createElement('div')
  frame.id = 'frame'
  const stage = document.createElement('div')
  stage.id = 'stage'
  stage.style.width = `${STAGE_W}px`
  stage.style.height = `${STAGE_H}px`
  frame.append(stage)
  root.append(frame)
  const fit = () => {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
    stage.style.transform = `scale(${s})`
  }
  window.addEventListener('resize', fit)
  fit()
  return stage
}
```

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>What the Light Touched</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts` (placeholder boot, replaced in Task 16):

```ts
import { createStage } from './app'

const root = document.getElementById('root')!
createStage(root)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/app.test.ts`
Expected: 2 passed. Also run `npm run dev` briefly and confirm a black letterboxed stage renders.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(scaffold): vite + typescript + vitest project with letterboxed 1280x720 stage"
```

---

### Task 2: Content schema (`types.ts`) + structural validation

**Files:**
- Create: `src/types.ts`, `src/data/validate.ts`
- Test: `tests/validate.test.ts`, `tests/fixtures.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type the rest of the plan uses — `GameData`, `Room`, `Hotspot`, `Exit`, `Condition`, `Effect`, `PuzzleRule`, `FractureShift`, `FinaleData`, `RoomId`, `ItemId` — plus `validateGameData(game: GameData): string[]` (empty array = valid) and the shared test fixture `makeTinyGame()`.

- [ ] **Step 1: Write the types**

`src/types.ts`:

```ts
export type RoomId = 'entry' | 'living' | 'kitchen' | 'bathroom' | 'bedroom'
export type ItemId = 'keyring' | 'polaroid' | 'notebook'

/** All coordinates are in 1280×720 stage space. */
export type Point = [number, number]

export type Condition =
  | { kind: 'flag'; name: string; is?: boolean }        // is defaults to true
  | { kind: 'hasItem'; item: ItemId }
  | { kind: 'fracturesAtLeast'; value: number }

export type Effect =
  | { kind: 'setFlag'; name: string; value?: boolean }  // value defaults to true
  | { kind: 'addItem'; item: ItemId }
  | { kind: 'setPlate'; room: RoomId; plate: string }
  | { kind: 'goToRoom'; room: RoomId }
  | { kind: 'sting'; id: string }
  | { kind: 'registerFracture'; id: string }
  | { kind: 'startFinale' }

export interface Hotspot {
  id: string
  polygon: Point[]
  examine: string
  /** Optional replacement Examine lines at fracture tiers (pick highest tier ≤ current). */
  examineTiered?: { tier: 1 | 2 | 3; text: string }[]
  lookAgain: string
  /** Present only on the 5 hotspot-pair contradictions (2 more come from the kitchen puzzle). */
  fractureId?: string
  visibleWhen?: Condition[]
  onExamine?: Effect[]
  onLookAgain?: Effect[]
}

export interface Exit {
  to: RoomId
  polygon: Point[]
  unlockedWhen?: Condition[]
  /** Mara's excuse when the exit is locked. Required if unlockedWhen is set. */
  lockedText?: string
}

export interface Plate {
  id: string
  src: string // path under public/, e.g. "photos/living-base.svg"
}

export interface Room {
  id: RoomId
  name: string
  plates: Plate[] // plates[0] is the base plate
  hotspots: Hotspot[]
  exits: Exit[]
}

export interface PuzzleRule {
  id: string
  requiresFlags: string[]
  onSolve: Effect[]
}

export interface FractureShift {
  at: number // fracture count threshold: 3, 5, or 7
  effects: Effect[]
}

export interface FinaleData {
  beats: string[]              // Mara's closing account, one text box per beat
  accuseBeatIndex: number      // which beat carries the misaligned word
  accuseWord: string           // exact word (must appear in that beat)
  minFractures: number         // 5
  endingA: string[]            // closing lines before credits + polaroid stinger
  endingB: {
    corrupt: [string, string][] // pairs of [mara, objective] that overwrite each other
    mirrorLookAgain: string     // the game's final objective description
  }
}

/** The game's single drag interaction (notebook → UV glow), data-driven so the
 *  reachability simulator (Task 17) can model it. */
export interface DragConfig {
  room: RoomId
  item: ItemId                 // must be held for the draggable to appear
  spawnAt: Point               // where the draggable spawns in the room
  glowPolygon: Point[]         // drop region (the UV nightlight's glow)
  revealedFlag: string         // flag proving the reveal happened ('readNotebook')
  revealText: string           // Edith's counter-narration shown on reveal
  onRevealed: Effect[]         // must include setFlag of revealedFlag
}

export interface GameData {
  startRoom: RoomId
  fractureIds: string[]        // canonical list, length 7
  rooms: Room[]
  puzzles: PuzzleRule[]
  fractureShifts: FractureShift[]
  drag?: DragConfig
  finale: FinaleData
}
```

- [ ] **Step 2: Write the failing tests**

`tests/fixtures.ts` — a tiny 2-room valid game reused by many later tests:

```ts
import type { GameData } from '../src/types'

export function makeTinyGame(): GameData {
  return {
    startRoom: 'entry',
    fractureIds: ['f1'],
    rooms: [
      {
        id: 'entry',
        name: 'Entry Hall',
        plates: [{ id: 'base', src: 'photos/entry-base.svg' }],
        hotspots: [
          {
            id: 'coat-rack',
            polygon: [[10, 10], [100, 10], [100, 100], [10, 100]],
            examine: 'MARA: Her coat rack.',
            lookAgain: 'A coat rack. Three empty hooks.',
          },
          {
            id: 'mail-pile',
            polygon: [[200, 10], [300, 10], [300, 100], [200, 100]],
            examine: 'MARA: Just junk mail.',
            lookAgain: 'Unopened letters addressed to two different names.',
            fractureId: 'f1',
            onExamine: [{ kind: 'setFlag', name: 'sawMail' }],
          },
        ],
        exits: [
          {
            to: 'living',
            polygon: [[1100, 200], [1280, 200], [1280, 600], [1100, 600]],
            unlockedWhen: [{ kind: 'flag', name: 'sawMail' }],
            lockedText: "MARA: Let's not rush. Look around first.",
          },
        ],
      },
      {
        id: 'living',
        name: 'Living Room',
        plates: [
          { id: 'base', src: 'photos/living-base.svg' },
          { id: 'shifted', src: 'photos/living-shifted.svg' },
        ],
        hotspots: [
          {
            id: 'chair',
            polygon: [[400, 300], [600, 300], [600, 500], [400, 500]],
            examine: 'MARA: Her reading chair.',
            lookAgain: 'A chair facing the wall.',
            onLookAgain: [{ kind: 'startFinale' }],
          },
        ],
        exits: [{ to: 'entry', polygon: [[0, 200], [80, 200], [80, 600], [0, 600]] }],
      },
    ],
    puzzles: [],
    fractureShifts: [],
    finale: {
      beats: ['She was at peace here. I am certain of that.'],
      accuseBeatIndex: 0,
      accuseWord: 'certain',
      minFractures: 1,
      endingA: ['You pack the last box.'],
      endingB: {
        corrupt: [['She was at peace.', 'The chair faced the wall.']],
        mirrorLookAgain: 'A mirror. You look again.',
      },
    },
  }
}
```

`tests/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateGameData } from '../src/data/validate'
import { makeTinyGame } from './fixtures'
import type { GameData } from '../src/types'

describe('validateGameData', () => {
  it('accepts a well-formed game', () => {
    expect(validateGameData(makeTinyGame())).toEqual([])
  })

  it('rejects an exit to a nonexistent room', () => {
    const g = makeTinyGame()
    g.rooms[0]!.exits[0]!.to = 'attic' as never
    expect(validateGameData(g).join()).toMatch(/exit.*attic/i)
  })

  it('rejects duplicate hotspot ids across the game', () => {
    const g = makeTinyGame()
    g.rooms[1]!.hotspots[0]!.id = 'coat-rack'
    expect(validateGameData(g).join()).toMatch(/duplicate hotspot/i)
  })

  it('rejects fracture ids not in the canonical list', () => {
    const g = makeTinyGame()
    g.rooms[0]!.hotspots[1]!.fractureId = 'f99'
    expect(validateGameData(g).join()).toMatch(/f99/)
  })

  it('rejects polygons with fewer than 3 points', () => {
    const g = makeTinyGame()
    g.rooms[0]!.hotspots[0]!.polygon = [[0, 0], [1, 1]]
    expect(validateGameData(g).join()).toMatch(/polygon/i)
  })

  it('rejects setPlate effects referencing unknown plates', () => {
    const g: GameData = makeTinyGame()
    g.rooms[0]!.hotspots[1]!.onExamine = [{ kind: 'setPlate', room: 'living', plate: 'nope' }]
    expect(validateGameData(g).join()).toMatch(/plate.*nope/i)
  })

  it('rejects a finale whose accuseWord is missing from its beat', () => {
    const g = makeTinyGame()
    g.finale.accuseWord = 'zeppelin'
    expect(validateGameData(g).join()).toMatch(/accuseWord/i)
  })

  it('rejects locked exits without lockedText', () => {
    const g = makeTinyGame()
    delete g.rooms[0]!.exits[0]!.lockedText
    expect(validateGameData(g).join()).toMatch(/lockedText/i)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — cannot resolve `../src/data/validate`.

- [ ] **Step 4: Implement**

`src/data/validate.ts`:

```ts
import type { Effect, GameData } from '../types'

export function validateGameData(game: GameData): string[] {
  const errors: string[] = []
  const roomIds = new Set(game.rooms.map(r => r.id))
  const plateIds = new Map(game.rooms.map(r => [r.id, new Set(r.plates.map(p => p.id))]))
  const fractureIds = new Set(game.fractureIds)
  const seenHotspots = new Set<string>()

  if (!roomIds.has(game.startRoom)) errors.push(`startRoom ${game.startRoom} does not exist`)

  const checkEffects = (effects: Effect[] | undefined, where: string) => {
    for (const e of effects ?? []) {
      if (e.kind === 'goToRoom' && !roomIds.has(e.room))
        errors.push(`${where}: goToRoom to unknown room ${e.room}`)
      if (e.kind === 'setPlate') {
        if (!roomIds.has(e.room)) errors.push(`${where}: setPlate on unknown room ${e.room}`)
        else if (!plateIds.get(e.room)!.has(e.plate))
          errors.push(`${where}: setPlate to unknown plate ${e.plate} in ${e.room}`)
      }
      if (e.kind === 'registerFracture' && !fractureIds.has(e.id))
        errors.push(`${where}: registerFracture of unknown fracture ${e.id}`)
    }
  }

  for (const room of game.rooms) {
    if (room.plates.length === 0) errors.push(`room ${room.id} has no plates`)
    for (const h of room.hotspots) {
      const where = `${room.id}/${h.id}`
      if (seenHotspots.has(h.id)) errors.push(`duplicate hotspot id ${h.id}`)
      seenHotspots.add(h.id)
      if (h.polygon.length < 3) errors.push(`${where}: polygon needs >= 3 points`)
      if (h.fractureId && !fractureIds.has(h.fractureId))
        errors.push(`${where}: unknown fractureId ${h.fractureId}`)
      if (!h.examine) errors.push(`${where}: missing examine text`)
      if (!h.lookAgain) errors.push(`${where}: missing lookAgain text`)
      checkEffects(h.onExamine, where)
      checkEffects(h.onLookAgain, where)
    }
    for (const exit of room.exits) {
      const where = `${room.id}/exit:${exit.to}`
      if (!roomIds.has(exit.to)) errors.push(`${where}: exit to unknown room ${exit.to}`)
      if (exit.polygon.length < 3) errors.push(`${where}: polygon needs >= 3 points`)
      if (exit.unlockedWhen && !exit.lockedText)
        errors.push(`${where}: locked exit missing lockedText`)
    }
  }

  for (const p of game.puzzles) checkEffects(p.onSolve, `puzzle:${p.id}`)
  for (const s of game.fractureShifts) checkEffects(s.effects, `shift@${s.at}`)
  if (game.drag) {
    checkEffects(game.drag.onRevealed, 'drag')
    if (!roomIds.has(game.drag.room)) errors.push(`drag: unknown room ${game.drag.room}`)
  }

  const beat = game.finale.beats[game.finale.accuseBeatIndex]
  if (beat === undefined) errors.push('finale: accuseBeatIndex out of range')
  else if (!beat.includes(game.finale.accuseWord))
    errors.push(`finale: accuseWord "${game.finale.accuseWord}" not found in beat ${game.finale.accuseBeatIndex}`)

  return errors
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/validate.test.ts`
Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/validate.ts tests/validate.test.ts tests/fixtures.ts
git commit -m "feat(data): game.json content schema and structural validator"
```

---

### Task 3: State store

**Files:**
- Create: `src/state/store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: `RoomId`, `ItemId` from `src/types.ts`.
- Produces: `SaveState` (plain serializable object), `Store` class with `getFlag(name): boolean`, `setFlag(name, value?)`, `hasItem(item): boolean`, `addItem(item)`, `items(): ItemId[]`, `registerFracture(id): boolean` (true if newly registered), `fractureCount(): number`, `fractureIds(): string[]`, `currentRoom(): RoomId`, `setRoom(room)`, `plateOverride(room): string | undefined`, `setPlateOverride(room, plateId)`, `subscribe(fn): () => void`, `snapshot(): SaveState`; plus `fractureTier(count: number): 0 | 1 | 2 | 3` and `makeInitialState(startRoom): SaveState`.

- [ ] **Step 1: Write the failing tests**

`tests/store.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { Store, fractureTier, makeInitialState } from '../src/state/store'

const fresh = () => new Store(makeInitialState('entry'))

describe('Store', () => {
  it('flags default to false and can be set', () => {
    const s = fresh()
    expect(s.getFlag('x')).toBe(false)
    s.setFlag('x')
    expect(s.getFlag('x')).toBe(true)
    s.setFlag('x', false)
    expect(s.getFlag('x')).toBe(false)
  })

  it('registers fractures exactly once', () => {
    const s = fresh()
    expect(s.registerFracture('f1')).toBe(true)
    expect(s.registerFracture('f1')).toBe(false)
    expect(s.fractureCount()).toBe(1)
  })

  it('tracks items without duplicates', () => {
    const s = fresh()
    s.addItem('keyring')
    s.addItem('keyring')
    expect(s.items()).toEqual(['keyring'])
    expect(s.hasItem('keyring')).toBe(true)
    expect(s.hasItem('notebook')).toBe(false)
  })

  it('notifies subscribers on any mutation', () => {
    const s = fresh()
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.setFlag('a')
    s.addItem('polaroid')
    s.registerFracture('f2')
    expect(fn).toHaveBeenCalledTimes(3)
    off()
    s.setFlag('b')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('round-trips through snapshot', () => {
    const s = fresh()
    s.setFlag('a')
    s.addItem('notebook')
    s.registerFracture('f1')
    s.setRoom('living')
    s.setPlateOverride('living', 'shifted')
    const restored = new Store(JSON.parse(JSON.stringify(s.snapshot())))
    expect(restored.getFlag('a')).toBe(true)
    expect(restored.hasItem('notebook')).toBe(true)
    expect(restored.fractureCount()).toBe(1)
    expect(restored.currentRoom()).toBe('living')
    expect(restored.plateOverride('living')).toBe('shifted')
  })
})

describe('fractureTier', () => {
  it('maps counts to shift tiers at 3/5/7', () => {
    expect(fractureTier(0)).toBe(0)
    expect(fractureTier(2)).toBe(0)
    expect(fractureTier(3)).toBe(1)
    expect(fractureTier(4)).toBe(1)
    expect(fractureTier(5)).toBe(2)
    expect(fractureTier(6)).toBe(2)
    expect(fractureTier(7)).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/store.test.ts`
Expected: FAIL — cannot resolve `../src/state/store`.

- [ ] **Step 3: Implement**

`src/state/store.ts`:

```ts
import type { ItemId, RoomId } from '../types'

export interface SaveState {
  flags: Record<string, boolean>
  fractures: string[]
  items: ItemId[]
  currentRoom: RoomId
  plateOverrides: Partial<Record<RoomId, string>>
}

export function makeInitialState(startRoom: RoomId): SaveState {
  return { flags: {}, fractures: [], items: [], currentRoom: startRoom, plateOverrides: {} }
}

export function fractureTier(count: number): 0 | 1 | 2 | 3 {
  if (count >= 7) return 3
  if (count >= 5) return 2
  if (count >= 3) return 1
  return 0
}

export class Store {
  private listeners = new Set<(s: SaveState) => void>()

  constructor(private state: SaveState) {}

  private emit() { for (const fn of this.listeners) fn(this.state) }

  getFlag(name: string): boolean { return this.state.flags[name] === true }
  setFlag(name: string, value = true): void { this.state.flags[name] = value; this.emit() }

  hasItem(item: ItemId): boolean { return this.state.items.includes(item) }
  addItem(item: ItemId): void {
    if (this.hasItem(item)) return
    this.state.items.push(item)
    this.emit()
  }
  items(): ItemId[] { return [...this.state.items] }

  registerFracture(id: string): boolean {
    if (this.state.fractures.includes(id)) return false
    this.state.fractures.push(id)
    this.emit()
    return true
  }
  fractureCount(): number { return this.state.fractures.length }
  fractureIds(): string[] { return [...this.state.fractures] }

  currentRoom(): RoomId { return this.state.currentRoom }
  setRoom(room: RoomId): void { this.state.currentRoom = room; this.emit() }

  plateOverride(room: RoomId): string | undefined { return this.state.plateOverrides[room] }
  setPlateOverride(room: RoomId, plateId: string): void {
    this.state.plateOverrides[room] = plateId
    this.emit()
  }

  subscribe(fn: (s: SaveState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  snapshot(): SaveState { return JSON.parse(JSON.stringify(this.state)) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/store.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts tests/store.test.ts
git commit -m "feat(state): flat save-state store with fracture registry and tiers"
```

---

### Task 4: Persistence (IndexedDB + memory fallback + save codes)

**Files:**
- Create: `src/state/persist.ts`
- Test: `tests/persist.test.ts`

**Interfaces:**
- Consumes: `SaveState` from `src/state/store.ts`.
- Produces: `interface StorageAdapter { load(): Promise<SaveState | null>; save(s: SaveState): Promise<void> }`, `MemoryAdapter`, `IdbAdapter`, `pickAdapter(): Promise<StorageAdapter>`, `encodeSaveCode(s: SaveState): string`, `decodeSaveCode(code: string): SaveState | null`. Task 11's autosave and Task 16's boot use these.

- [ ] **Step 1: Write the failing tests**

`tests/persist.test.ts` (IndexedDB is absent in happy-dom, which conveniently also tests the fallback path):

```ts
import { describe, it, expect } from 'vitest'
import { MemoryAdapter, pickAdapter, encodeSaveCode, decodeSaveCode } from '../src/state/persist'
import { makeInitialState } from '../src/state/store'

describe('persistence', () => {
  it('MemoryAdapter round-trips a save', async () => {
    const a = new MemoryAdapter()
    expect(await a.load()).toBeNull()
    const s = makeInitialState('entry')
    s.flags['x'] = true
    await a.save(s)
    expect((await a.load())?.flags['x']).toBe(true)
  })

  it('save codes round-trip', () => {
    const s = makeInitialState('living')
    s.fractures.push('f1', 'f2')
    const decoded = decodeSaveCode(encodeSaveCode(s))
    expect(decoded?.currentRoom).toBe('living')
    expect(decoded?.fractures).toEqual(['f1', 'f2'])
  })

  it('decodeSaveCode returns null on garbage', () => {
    expect(decodeSaveCode('not-a-save')).toBeNull()
    expect(decodeSaveCode(btoa('{"nope":1}'))).toBeNull()
  })

  it('pickAdapter falls back to memory when IndexedDB is unavailable', async () => {
    const a = await pickAdapter()
    expect(a).toBeInstanceOf(MemoryAdapter)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/persist.test.ts`
Expected: FAIL — cannot resolve `../src/state/persist`.

- [ ] **Step 3: Implement**

`src/state/persist.ts`:

```ts
import type { SaveState } from './store'

export interface StorageAdapter {
  load(): Promise<SaveState | null>
  save(s: SaveState): Promise<void>
}

export class MemoryAdapter implements StorageAdapter {
  private state: SaveState | null = null
  async load() { return this.state }
  async save(s: SaveState) { this.state = JSON.parse(JSON.stringify(s)) }
}

const DB_NAME = 'wtlt'
const STORE = 'save'
const KEY = 'slot0'

export class IdbAdapter implements StorageAdapter {
  private db: Promise<IDBDatabase>

  constructor() {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async load(): Promise<SaveState | null> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as SaveState) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async save(s: SaveState): Promise<void> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(JSON.parse(JSON.stringify(s)), KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

export async function pickAdapter(): Promise<StorageAdapter> {
  if (typeof indexedDB === 'undefined') return new MemoryAdapter()
  try {
    const idb = new IdbAdapter()
    await idb.load() // probe: throws if storage is blocked
    return idb
  } catch {
    return new MemoryAdapter()
  }
}

export function encodeSaveCode(s: SaveState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
}

export function decodeSaveCode(code: string): SaveState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(code))))
    if (!parsed || typeof parsed !== 'object') return null
    if (!('flags' in parsed) || !('fractures' in parsed) || !('currentRoom' in parsed)) return null
    return parsed as SaveState
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/persist.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/state/persist.ts tests/persist.test.ts
git commit -m "feat(state): indexeddb persistence with memory fallback and save codes"
```

---

### Task 5: Stage renderer (photo plates, 400ms crossfade)

**Files:**
- Create: `src/engine/stage.ts`
- Modify: `src/style.css` (append plate styles)
- Test: `tests/stage.test.ts`

**Interfaces:**
- Consumes: the `#stage` element from `createStage` (Task 1).
- Produces: `Stage` class — `constructor(stageEl: HTMLElement)`, `showPlate(src: string): Promise<void>` (400ms crossfade, resolves when done; instant if same src), `currentSrc(): string | null`. `CROSSFADE_MS = 400` exported.

- [ ] **Step 1: Write the failing tests**

`tests/stage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Stage, CROSSFADE_MS } from '../src/engine/stage'

describe('Stage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => {
    const el = document.createElement('div')
    return { el, stage: new Stage(el) }
  }

  it('creates two stacked image layers', () => {
    const { el } = make()
    expect(el.querySelectorAll('img.plate').length).toBe(2)
  })

  it('crossfades to a new plate over 400ms', async () => {
    const { el, stage } = make()
    const p = stage.showPlate('photos/a.svg')
    const imgs = [...el.querySelectorAll<HTMLImageElement>('img.plate')]
    const incoming = imgs.find(i => i.src.includes('a.svg'))!
    expect(incoming.classList.contains('visible')).toBe(true)
    let done = false
    p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(CROSSFADE_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
    expect(stage.currentSrc()).toContain('a.svg')
  })

  it('is a no-op when showing the current plate again', async () => {
    const { stage } = make()
    const first = stage.showPlate('photos/a.svg')
    await vi.advanceTimersByTimeAsync(CROSSFADE_MS)
    await first
    const p = stage.showPlate('photos/a.svg')
    let done = false
    p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/stage.test.ts`
Expected: FAIL — cannot resolve `../src/engine/stage`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
img.plate {
  position: absolute; inset: 0; width: 1280px; height: 720px;
  opacity: 0; transition: opacity 400ms ease;
  pointer-events: none;
}
img.plate.visible { opacity: 1; }
```

`src/engine/stage.ts` (CSS transitions don't fire events in happy-dom, so completion is timed with `setTimeout` — which also makes it deterministic under fake timers):

```ts
export const CROSSFADE_MS = 400

export class Stage {
  private front: HTMLImageElement
  private back: HTMLImageElement
  private src: string | null = null

  constructor(stageEl: HTMLElement) {
    this.front = this.makeLayer(stageEl)
    this.back = this.makeLayer(stageEl)
  }

  private makeLayer(parent: HTMLElement): HTMLImageElement {
    const img = document.createElement('img')
    img.className = 'plate'
    img.alt = ''
    parent.append(img)
    return img
  }

  currentSrc(): string | null { return this.src }

  showPlate(src: string): Promise<void> {
    if (this.src === src) return Promise.resolve()
    this.src = src
    const incoming = this.back
    const outgoing = this.front
    incoming.src = src
    incoming.classList.add('visible')
    outgoing.classList.remove('visible')
    this.back = outgoing
    this.front = incoming
    return new Promise(resolve => setTimeout(resolve, CROSSFADE_MS))
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/stage.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/stage.ts src/style.css tests/stage.test.ts
git commit -m "feat(engine): photo plate stage with 400ms crossfade"
```

---

### Task 6: Hotspot layer (invisible SVG polygons, cursor, breathe mode)

**Files:**
- Create: `src/engine/hotspots.ts`
- Modify: `src/style.css` (append hotspot styles)
- Test: `tests/hotspots.test.ts`

**Interfaces:**
- Consumes: `Hotspot`, `Exit` from `src/types.ts`; the `#stage` element.
- Produces: `HotspotLayer` class — `constructor(stageEl: HTMLElement, handlers: { onHotspot(id: string): void; onExit(to: string): void })`, `setScene(hotspots: Hotspot[], exits: Exit[], isVisible: (h: Hotspot) => boolean)`, `refresh()` (re-evaluates visibility after state changes), `setBreathe(on: boolean)`. Polygons carry `data-id`; exits carry `data-exit`.

- [ ] **Step 1: Write the failing tests**

`tests/hotspots.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { HotspotLayer } from '../src/engine/hotspots'
import { makeTinyGame } from './fixtures'

const setup = () => {
  const el = document.createElement('div')
  const onHotspot = vi.fn()
  const onExit = vi.fn()
  const layer = new HotspotLayer(el, { onHotspot, onExit })
  return { el, layer, onHotspot, onExit }
}

describe('HotspotLayer', () => {
  it('renders one polygon per visible hotspot and exit', () => {
    const { el, layer } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, () => true)
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(2)
    expect(el.querySelectorAll('polygon[data-exit]').length).toBe(1)
  })

  it('omits hotspots whose visibility predicate is false', () => {
    const { el, layer } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, h => h.id !== 'mail-pile')
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(1)
  })

  it('dispatches clicks to the right handler', () => {
    const { el, layer, onHotspot, onExit } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, () => true)
    el.querySelector<SVGPolygonElement>('polygon[data-id="coat-rack"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onHotspot).toHaveBeenCalledWith('coat-rack')
    el.querySelector<SVGPolygonElement>('polygon[data-exit="living"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onExit).toHaveBeenCalledWith('living')
  })

  it('toggles the breathe class', () => {
    const { el, layer } = setup()
    layer.setBreathe(true)
    expect(el.querySelector('svg.hotspots')!.classList.contains('breathe')).toBe(true)
    layer.setBreathe(false)
    expect(el.querySelector('svg.hotspots')!.classList.contains('breathe')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/hotspots.test.ts`
Expected: FAIL — cannot resolve `../src/engine/hotspots`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
svg.hotspots { position: absolute; inset: 0; z-index: 10; }
svg.hotspots polygon {
  fill: transparent; stroke: none; pointer-events: fill;
  cursor: pointer;
}
/* Breathe mode: dim the world, faintly lift the interactive regions.
   Diegetic framing: Mara steadying herself. */
svg.hotspots.breathe { background: rgba(0, 0, 0, 0.55); transition: background 200ms; }
svg.hotspots.breathe polygon { fill: rgba(255, 255, 240, 0.18); }
```

`src/engine/hotspots.ts`:

```ts
import type { Exit, Hotspot } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface HotspotHandlers {
  onHotspot(id: string): void
  onExit(to: string): void
}

export class HotspotLayer {
  private svg: SVGSVGElement
  private hotspots: Hotspot[] = []
  private exits: Exit[] = []
  private isVisible: (h: Hotspot) => boolean = () => true

  constructor(stageEl: HTMLElement, private handlers: HotspotHandlers) {
    this.svg = document.createElementNS(SVG_NS, 'svg')
    this.svg.setAttribute('class', 'hotspots')
    this.svg.setAttribute('viewBox', '0 0 1280 720')
    this.svg.setAttribute('width', '1280')
    this.svg.setAttribute('height', '720')
    this.svg.addEventListener('click', e => {
      const poly = (e.target as Element).closest('polygon')
      if (!poly) return
      const id = poly.getAttribute('data-id')
      const exit = poly.getAttribute('data-exit')
      if (id) this.handlers.onHotspot(id)
      else if (exit) this.handlers.onExit(exit)
    })
    stageEl.append(this.svg)
  }

  setScene(hotspots: Hotspot[], exits: Exit[], isVisible: (h: Hotspot) => boolean): void {
    this.hotspots = hotspots
    this.exits = exits
    this.isVisible = isVisible
    this.refresh()
  }

  refresh(): void {
    this.svg.replaceChildren()
    for (const h of this.hotspots) {
      if (!this.isVisible(h)) continue
      this.svg.append(this.polygon(h.polygon, 'data-id', h.id))
    }
    for (const x of this.exits) {
      this.svg.append(this.polygon(x.polygon, 'data-exit', x.to))
    }
  }

  setBreathe(on: boolean): void {
    this.svg.classList.toggle('breathe', on)
  }

  private polygon(points: [number, number][], attr: string, value: string): SVGPolygonElement {
    const poly = document.createElementNS(SVG_NS, 'polygon')
    poly.setAttribute('points', points.map(p => p.join(',')).join(' '))
    poly.setAttribute(attr, value)
    return poly
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/hotspots.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/hotspots.ts src/style.css tests/hotspots.test.ts
git commit -m "feat(engine): invisible svg polygon hotspot layer with breathe mode"
```

---

### Task 7: Text box (typewriter Mara vs instant objective)

**Files:**
- Create: `src/engine/textbox.ts`
- Modify: `src/style.css` (append text band styles)
- Test: `tests/textbox.test.ts`

**Interfaces:**
- Consumes: the `#stage` element.
- Produces: `TextBox` class — `constructor(stageEl: HTMLElement, opts?: { charsPerSecond?: number })`, `showNarration(sourceId: string, text: string): Promise<void>` (typewriter; promise resolves when fully typed), `showObjective(sourceId: string, text: string): void` (instant, complete), `showingFor(): string | null` (which source's text is currently on screen — the Look Again window), `skip(): void` (finish typing instantly), `clear(): void`, `setSpeed(cps: number)`. Also exposes its root element as `.el` for the finale task. Default speed 40 cps.

- [ ] **Step 1: Write the failing tests**

`tests/textbox.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TextBox } from '../src/engine/textbox'

describe('TextBox', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => {
    const el = document.createElement('div')
    return { el, box: new TextBox(el, { charsPerSecond: 10 }) } // 100ms per char
  }

  it('types narration on over time and resolves when done', async () => {
    const { el, box } = make()
    const p = box.showNarration('chair', 'abcde')
    const band = el.querySelector('.textband')!
    await vi.advanceTimersByTimeAsync(250)
    expect(band.textContent!.length).toBeGreaterThan(0)
    expect(band.textContent!.length).toBeLessThan(5)
    await vi.advanceTimersByTimeAsync(300)
    await p
    expect(band.textContent).toBe('abcde')
    expect(band.classList.contains('mara')).toBe(true)
  })

  it('shows objective text instantly and completely', () => {
    const { el, box } = make()
    box.showObjective('chair', 'A chair facing the wall.')
    const band = el.querySelector('.textband')!
    expect(band.textContent).toBe('A chair facing the wall.')
    expect(band.classList.contains('objective')).toBe(true)
  })

  it('tracks which source is showing until cleared', async () => {
    const { box } = make()
    expect(box.showingFor()).toBeNull()
    void box.showNarration('chair', 'ab')
    expect(box.showingFor()).toBe('chair')
    await vi.advanceTimersByTimeAsync(500)
    expect(box.showingFor()).toBe('chair') // stays after typing completes
    box.clear()
    expect(box.showingFor()).toBeNull()
  })

  it('skip() completes typing instantly', async () => {
    const { el, box } = make()
    const p = box.showNarration('chair', 'abcdefghij')
    await vi.advanceTimersByTimeAsync(100)
    box.skip()
    await p
    expect(el.querySelector('.textband')!.textContent).toBe('abcdefghij')
  })

  it('a new show replaces the previous source', () => {
    const { box } = make()
    void box.showNarration('chair', 'ab')
    box.showObjective('window', 'x')
    expect(box.showingFor()).toBe('window')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/textbox.test.ts`
Expected: FAIL — cannot resolve `../src/engine/textbox`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
.textband {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 20;
  min-height: 96px; padding: 20px 48px 28px; box-sizing: border-box;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82) 30%);
  color: #e8e2d6; font-size: 22px; line-height: 1.45;
}
.textband.mara { font-style: italic; }
.textband.objective {
  font-style: normal; font-family: 'Courier New', monospace;
  color: #cfd4d6; font-size: 19px;
}
.textband:empty { display: none; }
```

`src/engine/textbox.ts`:

```ts
export class TextBox {
  readonly el: HTMLElement
  private cps: number
  private source: string | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private pending: { full: string; resolve: () => void } | null = null

  constructor(stageEl: HTMLElement, opts?: { charsPerSecond?: number }) {
    this.cps = opts?.charsPerSecond ?? 40
    this.el = document.createElement('div')
    this.el.className = 'textband'
    stageEl.append(this.el)
  }

  setSpeed(cps: number): void { this.cps = cps }
  showingFor(): string | null { return this.source }

  showNarration(sourceId: string, text: string): Promise<void> {
    this.stopTyping()
    this.source = sourceId
    this.el.className = 'textband mara'
    this.el.textContent = ''
    return new Promise(resolve => {
      this.pending = { full: text, resolve }
      let i = 0
      this.timer = setInterval(() => {
        i++
        this.el.textContent = text.slice(0, i)
        if (i >= text.length) this.finishTyping()
      }, 1000 / this.cps)
    })
  }

  showObjective(sourceId: string, text: string): void {
    this.stopTyping()
    this.source = sourceId
    this.el.className = 'textband objective'
    this.el.textContent = text
  }

  skip(): void {
    if (!this.pending) return
    this.el.textContent = this.pending.full
    this.finishTyping()
  }

  clear(): void {
    this.stopTyping()
    this.source = null
    this.el.className = 'textband'
    this.el.textContent = ''
  }

  private finishTyping(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    const p = this.pending
    this.pending = null
    p?.resolve()
  }

  private stopTyping(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    // resolve any dangling promise so callers never hang
    this.pending?.resolve()
    this.pending = null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/textbox.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/textbox.ts src/style.css tests/textbox.test.ts
git commit -m "feat(engine): text band with typewriter narration and instant objective voice"
```

---

### Task 8: Conditions + effects executor

**Files:**
- Create: `src/engine/effects.ts`
- Test: `tests/effects.test.ts`

**Interfaces:**
- Consumes: `Condition`, `Effect` from `src/types.ts`; `Store` from `src/state/store.ts`.
- Produces: `checkConditions(conds: Condition[] | undefined, store: Store): boolean` (undefined/empty = true, AND semantics) and `runEffects(effects: Effect[] | undefined, ctx: EffectContext): void` with:

```ts
export interface EffectContext {
  store: Store
  goToRoom(room: RoomId): void
  setPlate(room: RoomId, plateId: string): void
  playSting(id: string): void
  registerFracture(id: string): void
  startFinale(): void
}
```

Tasks 9–12, 16, and 18 all consume `EffectContext`.

- [ ] **Step 1: Write the failing tests**

`tests/effects.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { checkConditions, runEffects, type EffectContext } from '../src/engine/effects'
import { Store, makeInitialState } from '../src/state/store'

const makeCtx = () => {
  const store = new Store(makeInitialState('entry'))
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(),
    setPlate: vi.fn(),
    playSting: vi.fn(),
    registerFracture: vi.fn(),
    startFinale: vi.fn(),
  }
  return { store, ctx }
}

describe('checkConditions', () => {
  it('treats undefined and empty as true', () => {
    const { store } = makeCtx()
    expect(checkConditions(undefined, store)).toBe(true)
    expect(checkConditions([], store)).toBe(true)
  })

  it('ANDs flag, item, and fracture conditions', () => {
    const { store } = makeCtx()
    store.setFlag('a')
    store.addItem('keyring')
    store.registerFracture('f1')
    expect(checkConditions([
      { kind: 'flag', name: 'a' },
      { kind: 'hasItem', item: 'keyring' },
      { kind: 'fracturesAtLeast', value: 1 },
    ], store)).toBe(true)
    expect(checkConditions([
      { kind: 'flag', name: 'a' },
      { kind: 'fracturesAtLeast', value: 2 },
    ], store)).toBe(false)
  })

  it('supports negated flags via is:false', () => {
    const { store } = makeCtx()
    expect(checkConditions([{ kind: 'flag', name: 'x', is: false }], store)).toBe(true)
    store.setFlag('x')
    expect(checkConditions([{ kind: 'flag', name: 'x', is: false }], store)).toBe(false)
  })
})

describe('runEffects', () => {
  it('executes each effect against store or context', () => {
    const { store, ctx } = makeCtx()
    runEffects([
      { kind: 'setFlag', name: 'done' },
      { kind: 'addItem', item: 'notebook' },
      { kind: 'setPlate', room: 'living', plate: 'shifted' },
      { kind: 'goToRoom', room: 'kitchen' },
      { kind: 'sting', id: 'shutter' },
      { kind: 'registerFracture', id: 'f3' },
      { kind: 'startFinale' },
    ], ctx)
    expect(store.getFlag('done')).toBe(true)
    expect(store.hasItem('notebook')).toBe(true)
    expect(ctx.setPlate).toHaveBeenCalledWith('living', 'shifted')
    expect(ctx.goToRoom).toHaveBeenCalledWith('kitchen')
    expect(ctx.playSting).toHaveBeenCalledWith('shutter')
    expect(ctx.registerFracture).toHaveBeenCalledWith('f3')
    expect(ctx.startFinale).toHaveBeenCalled()
  })

  it('is a no-op on undefined', () => {
    const { ctx } = makeCtx()
    expect(() => runEffects(undefined, ctx)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/effects.test.ts`
Expected: FAIL — cannot resolve `../src/engine/effects`.

- [ ] **Step 3: Implement**

`src/engine/effects.ts`:

```ts
import type { Condition, Effect, RoomId } from '../types'
import type { Store } from '../state/store'

export interface EffectContext {
  store: Store
  goToRoom(room: RoomId): void
  setPlate(room: RoomId, plateId: string): void
  playSting(id: string): void
  registerFracture(id: string): void
  startFinale(): void
}

export function checkConditions(conds: Condition[] | undefined, store: Store): boolean {
  for (const c of conds ?? []) {
    switch (c.kind) {
      case 'flag':
        if (store.getFlag(c.name) !== (c.is ?? true)) return false
        break
      case 'hasItem':
        if (!store.hasItem(c.item)) return false
        break
      case 'fracturesAtLeast':
        if (store.fractureCount() < c.value) return false
        break
    }
  }
  return true
}

export function runEffects(effects: Effect[] | undefined, ctx: EffectContext): void {
  for (const e of effects ?? []) {
    switch (e.kind) {
      case 'setFlag': ctx.store.setFlag(e.name, e.value ?? true); break
      case 'addItem': ctx.store.addItem(e.item); break
      case 'setPlate': ctx.setPlate(e.room, e.plate); break
      case 'goToRoom': ctx.goToRoom(e.room); break
      case 'sting': ctx.playSting(e.id); break
      case 'registerFracture': ctx.registerFracture(e.id); break
      case 'startFinale': ctx.startFinale(); break
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/effects.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.ts tests/effects.test.ts
git commit -m "feat(engine): condition checker and effect executor"
```

---

### Task 9: Fracture system (registration, tiers, 3/5/7 threshold shifts)

**Files:**
- Create: `src/engine/fractures.ts`
- Test: `tests/fractures.test.ts`

**Interfaces:**
- Consumes: `Hotspot`, `FractureShift` from `src/types.ts`; `Store`, `fractureTier` from `src/state/store.ts`; `EffectContext`, `runEffects` from `src/engine/effects.ts`.
- Produces: `FractureSystem` class — `constructor(store: Store, shifts: FractureShift[])` plus `setContext(ctx: EffectContext)`, `noteExamine(h: Hotspot)`, `noteLookAgain(h: Hotspot)` (registers the fracture when both halves have been seen), `register(id: string)` (direct registration, used by the `registerFracture` effect for the kitchen puzzle's double fracture), `tier(): 0 | 1 | 2 | 3`. Seen-flags are stored as `seenExamine:<hotspotId>` / `seenLookAgain:<hotspotId>`. Threshold shifts fire once each, deduped via flag `shiftFired:<at>`.

**Circularity note:** `EffectContext.registerFracture` will be wired (in Task 16's boot) to call `FractureSystem.register`, and shift effects run through the same `ctx`. `FractureSystem` receives the ctx lazily via a setter to break the construction cycle: `setContext(ctx)`.

- [ ] **Step 1: Write the failing tests**

`tests/fractures.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { FractureSystem } from '../src/engine/fractures'
import { Store, makeInitialState } from '../src/state/store'
import type { EffectContext } from '../src/engine/effects'
import type { Hotspot } from '../src/types'

const hotspot = (id: string, fractureId?: string): Hotspot => ({
  id, polygon: [[0, 0], [1, 0], [1, 1]], examine: 'x', lookAgain: 'y', fractureId,
})

const setup = (shifts = [] as { at: number; effects: any[] }[]) => {
  const store = new Store(makeInitialState('entry'))
  const fs = new FractureSystem(store, shifts)
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
    registerFracture: (id: string) => fs.register(id),
    startFinale: vi.fn(),
  }
  fs.setContext(ctx)
  return { store, fs, ctx }
}

describe('FractureSystem', () => {
  it('registers a fracture only when both halves are seen', () => {
    const { store, fs } = setup()
    const h = hotspot('chair', 'f1')
    fs.noteExamine(h)
    expect(store.fractureCount()).toBe(0)
    fs.noteLookAgain(h)
    expect(store.fractureCount()).toBe(1)
    fs.noteLookAgain(h) // repeat is idempotent
    expect(store.fractureCount()).toBe(1)
  })

  it('ignores hotspots without a fractureId', () => {
    const { store, fs } = setup()
    const h = hotspot('window')
    fs.noteExamine(h)
    fs.noteLookAgain(h)
    expect(store.fractureCount()).toBe(0)
    expect(store.getFlag('seenLookAgain:window')).toBe(true) // still tracked
  })

  it('fires threshold shifts exactly once when the count crosses them', () => {
    const setPlateEffects = [{ at: 2, effects: [{ kind: 'setPlate', room: 'living', plate: 'shifted' }] }]
    const { fs, ctx } = setup(setPlateEffects as any)
    fs.register('f1')
    expect(ctx.setPlate).not.toHaveBeenCalled()
    fs.register('f2')
    expect(ctx.setPlate).toHaveBeenCalledOnce()
    fs.register('f3')
    expect(ctx.setPlate).toHaveBeenCalledOnce() // not re-fired
  })

  it('reports the tier from the store count', () => {
    const { fs } = setup()
    ;['f1', 'f2', 'f3'].forEach(id => fs.register(id))
    expect(fs.tier()).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/fractures.test.ts`
Expected: FAIL — cannot resolve `../src/engine/fractures`.

- [ ] **Step 3: Implement**

`src/engine/fractures.ts`:

```ts
import type { FractureShift, Hotspot } from '../types'
import { Store, fractureTier } from '../state/store'
import { runEffects, type EffectContext } from './effects'

export class FractureSystem {
  private ctx: EffectContext | null = null

  constructor(private store: Store, private shifts: FractureShift[]) {}

  setContext(ctx: EffectContext): void { this.ctx = ctx }

  tier(): 0 | 1 | 2 | 3 { return fractureTier(this.store.fractureCount()) }

  noteExamine(h: Hotspot): void {
    this.store.setFlag(`seenExamine:${h.id}`)
  }

  noteLookAgain(h: Hotspot): void {
    this.store.setFlag(`seenLookAgain:${h.id}`)
    if (!h.fractureId) return
    if (this.store.getFlag(`seenExamine:${h.id}`)) this.register(h.fractureId)
  }

  register(id: string): void {
    if (!this.store.registerFracture(id)) return
    this.checkShifts()
  }

  private checkShifts(): void {
    if (!this.ctx) return
    const count = this.store.fractureCount()
    for (const shift of this.shifts) {
      const flag = `shiftFired:${shift.at}`
      if (count >= shift.at && !this.store.getFlag(flag)) {
        this.store.setFlag(flag)
        runEffects(shift.effects, this.ctx)
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/fractures.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/fractures.ts tests/fractures.test.ts
git commit -m "feat(engine): fracture registration with 3/5/7 threshold shifts"
```

---

### Task 10: Interaction controller (the Examine / Look Again loop)

This is the heart of the game — the two-click mechanic from spec §3.1. **Vertical-slice checkpoint:** after this task, wire a temporary boot and confirm the loop *feels* right (spec kill criterion).

**Files:**
- Create: `src/engine/interactions.ts`
- Test: `tests/interactions.test.ts`

**Interfaces:**
- Consumes: `TextBox` (Task 7), `FractureSystem` (Task 9), `EffectContext`/`runEffects` (Task 8), `Hotspot` type.
- Produces: `InteractionController` class —

```ts
constructor(deps: {
  textBox: TextBox
  fractures: FractureSystem
  ctx: EffectContext
  hooks?: {
    onExamineShown?(h: Hotspot): void   // audio: normal mix
    onLookAgainShown?(h: Hotspot): void // audio: hard silence
  }
})
handleHotspotClick(h: Hotspot): void
```

Rules implemented: first click on a hotspot → Examine (typewriter, tiered text at fracture tiers, `onExamine` effects, `noteExamine`). Click on the **same** hotspot while its text is showing → Look Again (instant objective text, `onLookAgain` effects, `noteLookAgain`, silence hook). Click on a *different* hotspot → that hotspot's Examine. Clicking the same hotspot after its text was cleared → Examine again.

- [ ] **Step 1: Write the failing tests**

`tests/interactions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InteractionController } from '../src/engine/interactions'
import { TextBox } from '../src/engine/textbox'
import { FractureSystem } from '../src/engine/fractures'
import { Store, makeInitialState } from '../src/state/store'
import type { EffectContext } from '../src/engine/effects'
import type { Hotspot } from '../src/types'

const chair: Hotspot = {
  id: 'chair',
  polygon: [[0, 0], [1, 0], [1, 1]],
  examine: 'MARA: Her reading chair. She was at peace.',
  examineTiered: [{ tier: 1, text: 'MARA: Why do you keep staring at the chair?' }],
  lookAgain: 'A chair facing the wall.',
  fractureId: 'f1',
  onExamine: [{ kind: 'setFlag', name: 'sawChair' }],
}
const lamp: Hotspot = {
  id: 'lamp', polygon: [[0, 0], [1, 0], [1, 1]],
  examine: 'MARA: Her lamp.', lookAgain: 'A lamp.',
}

const setup = () => {
  const store = new Store(makeInitialState('living'))
  const el = document.createElement('div')
  const textBox = new TextBox(el, { charsPerSecond: 1000 })
  const fractures = new FractureSystem(store, [])
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
    registerFracture: id => fractures.register(id),
    startFinale: vi.fn(),
  }
  fractures.setContext(ctx)
  const onExamineShown = vi.fn()
  const onLookAgainShown = vi.fn()
  const controller = new InteractionController({
    textBox, fractures, ctx,
    hooks: { onExamineShown, onLookAgainShown },
  })
  return { store, el, textBox, controller, onExamineShown, onLookAgainShown }
}

describe('InteractionController', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('first click examines: mara voice, effects run, hook fires', () => {
    const { store, el, controller, onExamineShown } = setup()
    controller.handleHotspotClick(chair)
    expect(el.querySelector('.textband')!.classList.contains('mara')).toBe(true)
    expect(store.getFlag('sawChair')).toBe(true)
    expect(store.getFlag('seenExamine:chair')).toBe(true)
    expect(onExamineShown).toHaveBeenCalledWith(chair)
  })

  it('second click on the same hotspot shows Look Again and registers the fracture', () => {
    const { store, el, controller, onLookAgainShown } = setup()
    controller.handleHotspotClick(chair)
    controller.handleHotspotClick(chair)
    const band = el.querySelector('.textband')!
    expect(band.classList.contains('objective')).toBe(true)
    expect(band.textContent).toBe('A chair facing the wall.')
    expect(store.fractureCount()).toBe(1)
    expect(onLookAgainShown).toHaveBeenCalledWith(chair)
  })

  it('clicking a different hotspot examines it instead', () => {
    const { store, controller } = setup()
    controller.handleHotspotClick(chair)
    controller.handleHotspotClick(lamp)
    expect(store.getFlag('seenExamine:lamp')).toBe(true)
    expect(store.fractureCount()).toBe(0)
  })

  it('after clear, the same hotspot examines again (no accidental Look Again)', () => {
    const { store, textBox, controller } = setup()
    controller.handleHotspotClick(chair)
    textBox.clear()
    controller.handleHotspotClick(chair)
    expect(store.getFlag('seenLookAgain:chair')).toBe(false)
  })

  it('uses tiered examine text once the fracture tier is high enough', () => {
    const { store, el, controller } = setup()
    ;['fa', 'fb', 'fc'].forEach(id => store.registerFracture(id)) // tier 1
    controller.handleHotspotClick(chair)
    vi.advanceTimersByTime(5000)
    expect(el.querySelector('.textband')!.textContent).toContain('Why do you keep staring')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/interactions.test.ts`
Expected: FAIL — cannot resolve `../src/engine/interactions`.

- [ ] **Step 3: Implement**

`src/engine/interactions.ts`:

```ts
import type { Hotspot } from '../types'
import type { TextBox } from './textbox'
import type { FractureSystem } from './fractures'
import { runEffects, type EffectContext } from './effects'

export interface InteractionHooks {
  onExamineShown?(h: Hotspot): void
  onLookAgainShown?(h: Hotspot): void
}

export class InteractionController {
  constructor(private deps: {
    textBox: TextBox
    fractures: FractureSystem
    ctx: EffectContext
    hooks?: InteractionHooks
  }) {}

  handleHotspotClick(h: Hotspot): void {
    const { textBox } = this.deps
    if (textBox.showingFor() === h.id) this.lookAgain(h)
    else this.examine(h)
  }

  private examine(h: Hotspot): void {
    const { textBox, fractures, ctx, hooks } = this.deps
    fractures.noteExamine(h)
    void textBox.showNarration(h.id, this.examineText(h))
    runEffects(h.onExamine, ctx)
    hooks?.onExamineShown?.(h)
  }

  private lookAgain(h: Hotspot): void {
    const { textBox, fractures, ctx, hooks } = this.deps
    textBox.showObjective(h.id, h.lookAgain)
    fractures.noteLookAgain(h)
    runEffects(h.onLookAgain, ctx)
    hooks?.onLookAgainShown?.(h)
  }

  /** Pick the highest tiered variant at or below the current fracture tier. */
  private examineText(h: Hotspot): string {
    const tier = this.deps.fractures.tier()
    let text = h.examine
    let best = 0
    for (const v of h.examineTiered ?? []) {
      if (v.tier <= tier && v.tier > best) { best = v.tier; text = v.text }
    }
    return text
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/interactions.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/interactions.ts tests/interactions.test.ts
git commit -m "feat(engine): examine/look-again two-click interaction controller"
```

---

### Task 11: Room manager (navigation, exit locks, autosave)

**Files:**
- Create: `src/engine/rooms.ts`
- Test: `tests/rooms.test.ts`

**Interfaces:**
- Consumes: `GameData`, `Room`, `Exit` types; `Store`; `Stage` (Task 5); `HotspotLayer` (Task 6); `TextBox` (Task 7); `checkConditions` (Task 8).
- Produces: `RoomManager` class —

```ts
constructor(deps: {
  game: GameData
  store: Store
  stage: Stage
  hotspots: HotspotLayer
  textBox: TextBox
  autosave: () => void            // called after every successful transition
  onRoomEntered?: (room: Room) => void  // audio hook (Task 15)
})
enter(roomId: RoomId): Promise<void>   // sets store room, crossfades plate, rebuilds hotspot scene
handleExitClick(to: string): void      // locked → Mara's lockedText; unlocked → enter + autosave
currentRoomData(): Room
refreshPlate(): Promise<void>          // re-shows current room's plate (for setPlate on current room)
```

Plate choice: `store.plateOverride(roomId)` if set, else `plates[0]`. Hotspot visibility predicate: `checkConditions(h.visibleWhen, store)`.

- [ ] **Step 1: Write the failing tests**

`tests/rooms.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomManager } from '../src/engine/rooms'
import { Stage } from '../src/engine/stage'
import { HotspotLayer } from '../src/engine/hotspots'
import { TextBox } from '../src/engine/textbox'
import { Store, makeInitialState } from '../src/state/store'
import { makeTinyGame } from './fixtures'

const setup = () => {
  const game = makeTinyGame()
  const store = new Store(makeInitialState(game.startRoom))
  const el = document.createElement('div')
  const stage = new Stage(el)
  const hotspots = new HotspotLayer(el, { onHotspot: vi.fn(), onExit: to => rm.handleExitClick(to) })
  const textBox = new TextBox(el, { charsPerSecond: 1000 })
  const autosave = vi.fn()
  const onRoomEntered = vi.fn()
  const rm = new RoomManager({ game, store, stage, hotspots, textBox, autosave, onRoomEntered })
  return { game, store, el, stage, rm, autosave, onRoomEntered, textBox }
}

describe('RoomManager', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('enter() shows the room plate and its hotspots', async () => {
    const { el, rm, stage, store } = setup()
    const p = rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    await p
    expect(stage.currentSrc()).toContain('entry-base.svg')
    expect(store.currentRoom()).toBe('entry')
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(2)
  })

  it('locked exits show lockedText and do not navigate', async () => {
    const { rm, el, store } = setup()
    void rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    rm.handleExitClick('living')
    await vi.advanceTimersByTimeAsync(2000)
    expect(store.currentRoom()).toBe('entry')
    expect(el.querySelector('.textband')!.textContent).toContain("Let's not rush")
  })

  it('unlocked exits navigate and autosave', async () => {
    const { rm, store, autosave, onRoomEntered } = setup()
    void rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    store.setFlag('sawMail') // satisfies the exit condition
    rm.handleExitClick('living')
    await vi.advanceTimersByTimeAsync(500)
    expect(store.currentRoom()).toBe('living')
    expect(autosave).toHaveBeenCalled()
    expect(onRoomEntered).toHaveBeenCalledTimes(2)
  })

  it('uses the plate override when set', async () => {
    const { rm, store, stage } = setup()
    store.setPlateOverride('living', 'shifted')
    store.setFlag('sawMail')
    void rm.enter('living')
    await vi.advanceTimersByTimeAsync(500)
    expect(stage.currentSrc()).toContain('living-shifted.svg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/rooms.test.ts`
Expected: FAIL — cannot resolve `../src/engine/rooms`.

- [ ] **Step 3: Implement**

`src/engine/rooms.ts`:

```ts
import type { GameData, Room, RoomId } from '../types'
import type { Store } from '../state/store'
import type { Stage } from './stage'
import type { HotspotLayer } from './hotspots'
import type { TextBox } from './textbox'
import { checkConditions } from './effects'

export class RoomManager {
  constructor(private deps: {
    game: GameData
    store: Store
    stage: Stage
    hotspots: HotspotLayer
    textBox: TextBox
    autosave: () => void
    onRoomEntered?: (room: Room) => void
  }) {}

  currentRoomData(): Room {
    const id = this.deps.store.currentRoom()
    const room = this.deps.game.rooms.find(r => r.id === id)
    if (!room) throw new Error(`unknown room ${id}`)
    return room
  }

  async enter(roomId: RoomId): Promise<void> {
    const { store, hotspots, textBox } = this.deps
    store.setRoom(roomId)
    const room = this.currentRoomData()
    textBox.clear()
    hotspots.setScene(room.hotspots, room.exits, h => checkConditions(h.visibleWhen, store))
    this.deps.onRoomEntered?.(room)
    await this.refreshPlate()
  }

  async refreshPlate(): Promise<void> {
    const room = this.currentRoomData()
    const overrideId = this.deps.store.plateOverride(room.id)
    const plate = room.plates.find(p => p.id === overrideId) ?? room.plates[0]!
    await this.deps.stage.showPlate(plate.src)
  }

  handleExitClick(to: string): void {
    const room = this.currentRoomData()
    const exit = room.exits.find(x => x.to === to)
    if (!exit) return
    if (!checkConditions(exit.unlockedWhen, this.deps.store)) {
      void this.deps.textBox.showNarration(`exit:${to}`, exit.lockedText ?? '...')
      return
    }
    void this.enter(exit.to).then(() => this.deps.autosave())
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/rooms.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rooms.ts tests/rooms.test.ts
git commit -m "feat(engine): room navigation with condition-locked exits and autosave"
```

---

### Task 12: Puzzle watcher (the kitchen calendar puzzle engine)

**Files:**
- Create: `src/engine/puzzles.ts`
- Test: `tests/puzzles.test.ts`

**Interfaces:**
- Consumes: `PuzzleRule` type; `Store`; `EffectContext`/`runEffects` (Task 8).
- Produces: `PuzzleWatcher` class — `constructor(store: Store, puzzles: PuzzleRule[], ctx: EffectContext)`, `start(): void` (subscribes to the store; whenever all of a puzzle's `requiresFlags` are true and `solved:<id>` is not, sets `solved:<id>` and runs `onSolve`). The kitchen puzzle is pure data: the calendar/fridge/dishes hotspots each `setFlag examined:<x>` in `onExamine`, and the rule fires the double fracture + bathroom unlock, spec §5 "clicking the three elements in any order after examining all."

- [ ] **Step 1: Write the failing tests**

`tests/puzzles.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { PuzzleWatcher } from '../src/engine/puzzles'
import { Store, makeInitialState } from '../src/state/store'
import type { EffectContext } from '../src/engine/effects'
import type { PuzzleRule } from '../src/types'

const kitchenPuzzle: PuzzleRule = {
  id: 'kitchen-timeline',
  requiresFlags: ['examined:calendar', 'examined:fridge', 'examined:dishes'],
  onSolve: [
    { kind: 'registerFracture', id: 'f4' },
    { kind: 'registerFracture', id: 'f5' },
    { kind: 'setFlag', name: 'kitchenSolved' },
  ],
}

const setup = () => {
  const store = new Store(makeInitialState('kitchen'))
  const registerFracture = vi.fn()
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
    registerFracture, startFinale: vi.fn(),
  }
  const watcher = new PuzzleWatcher(store, [kitchenPuzzle], ctx)
  watcher.start()
  return { store, registerFracture }
}

describe('PuzzleWatcher', () => {
  it('solves when all required flags are set, in any order', () => {
    const { store, registerFracture } = setup()
    store.setFlag('examined:dishes')
    store.setFlag('examined:calendar')
    expect(store.getFlag('kitchenSolved')).toBe(false)
    store.setFlag('examined:fridge')
    expect(store.getFlag('kitchenSolved')).toBe(true)
    expect(registerFracture).toHaveBeenCalledWith('f4')
    expect(registerFracture).toHaveBeenCalledWith('f5')
  })

  it('solves only once', () => {
    const { store, registerFracture } = setup()
    store.setFlag('examined:calendar')
    store.setFlag('examined:fridge')
    store.setFlag('examined:dishes')
    store.setFlag('examined:calendar') // extra mutation after solve
    expect(registerFracture).toHaveBeenCalledTimes(2)
  })

  it('checks pre-existing flags on start (load-save safety)', () => {
    const store = new Store(makeInitialState('kitchen'))
    store.setFlag('examined:calendar')
    store.setFlag('examined:fridge')
    store.setFlag('examined:dishes')
    const ctx: EffectContext = {
      store, goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
      registerFracture: vi.fn(), startFinale: vi.fn(),
    }
    new PuzzleWatcher(store, [kitchenPuzzle], ctx).start()
    expect(store.getFlag('kitchenSolved')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/puzzles.test.ts`
Expected: FAIL — cannot resolve `../src/engine/puzzles`.

- [ ] **Step 3: Implement**

`src/engine/puzzles.ts`:

```ts
import type { PuzzleRule } from '../types'
import type { Store } from '../state/store'
import { runEffects, type EffectContext } from './effects'

export class PuzzleWatcher {
  private checking = false

  constructor(
    private store: Store,
    private puzzles: PuzzleRule[],
    private ctx: EffectContext,
  ) {}

  start(): void {
    this.store.subscribe(() => this.check())
    this.check()
  }

  private check(): void {
    if (this.checking) return // effects mutate the store; don't recurse
    this.checking = true
    try {
      for (const p of this.puzzles) {
        const solvedFlag = `solved:${p.id}`
        if (this.store.getFlag(solvedFlag)) continue
        if (p.requiresFlags.every(f => this.store.getFlag(f))) {
          this.store.setFlag(solvedFlag)
          runEffects(p.onSolve, this.ctx)
        }
      }
    } finally {
      this.checking = false
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/puzzles.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/puzzles.ts tests/puzzles.test.ts
git commit -m "feat(engine): flag-watching puzzle rules for the calendar puzzle"
```

---

### Task 13: Inventory UI (3 fixed slots, hidden until first item)

**Files:**
- Create: `src/ui/inventory.ts`
- Modify: `src/style.css` (append inventory styles)
- Test: `tests/inventory.test.ts`

**Interfaces:**
- Consumes: `Store`; `ItemId`.
- Produces: `InventoryView` class — `constructor(stageEl: HTMLElement, store: Store)` (self-subscribes; renders 3 slots in the top-right corner, root element `.inventory`, hidden via `.hidden` class while the player has no items; each owned item renders as `.slot.filled[data-item]` with a label).

- [ ] **Step 1: Write the failing tests**

`tests/inventory.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { InventoryView } from '../src/ui/inventory'
import { Store, makeInitialState } from '../src/state/store'

const setup = () => {
  const store = new Store(makeInitialState('entry'))
  const el = document.createElement('div')
  new InventoryView(el, store)
  return { store, el }
}

describe('InventoryView', () => {
  it('is hidden until the first item is found', () => {
    const { store, el } = setup()
    const inv = el.querySelector('.inventory')!
    expect(inv.classList.contains('hidden')).toBe(true)
    store.addItem('keyring')
    expect(inv.classList.contains('hidden')).toBe(false)
  })

  it('always renders exactly 3 slots, filled in order found', () => {
    const { store, el } = setup()
    store.addItem('keyring')
    store.addItem('notebook')
    const slots = el.querySelectorAll('.inventory .slot')
    expect(slots.length).toBe(3)
    expect(el.querySelectorAll('.slot.filled').length).toBe(2)
    expect(slots[0]!.getAttribute('data-item')).toBe('keyring')
    expect(slots[1]!.getAttribute('data-item')).toBe('notebook')
    expect(slots[2]!.getAttribute('data-item')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/inventory.test.ts`
Expected: FAIL — cannot resolve `../src/ui/inventory`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
.inventory {
  position: absolute; top: 16px; right: 16px; z-index: 30;
  display: flex; gap: 8px;
}
.inventory.hidden { display: none; }
.inventory .slot {
  width: 72px; height: 72px; border-radius: 4px;
  background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e8e2d6; font-size: 11px; display: grid; place-items: center;
  text-align: center; padding: 4px; box-sizing: border-box;
}
.inventory .slot.filled { border-color: rgba(255, 255, 240, 0.5); }
```

`src/ui/inventory.ts`:

```ts
import type { Store } from '../state/store'

const LABELS: Record<string, string> = {
  keyring: "Edith's keys",
  polaroid: 'Polaroid camera',
  notebook: 'Notebook',
}

export class InventoryView {
  private el: HTMLElement

  constructor(stageEl: HTMLElement, private store: Store) {
    this.el = document.createElement('div')
    this.el.className = 'inventory hidden'
    stageEl.append(this.el)
    store.subscribe(() => this.refresh())
    this.refresh()
  }

  refresh(): void {
    const items = this.store.items()
    this.el.classList.toggle('hidden', items.length === 0)
    this.el.replaceChildren()
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div')
      slot.className = 'slot'
      const item = items[i]
      if (item) {
        slot.classList.add('filled')
        slot.setAttribute('data-item', item)
        slot.textContent = LABELS[item] ?? item
      }
      this.el.append(slot)
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/inventory.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/inventory.ts src/style.css tests/inventory.test.ts
git commit -m "feat(ui): three-slot inventory hidden until first item"
```

---

### Task 14: Geometry helper + notebook drag (the game's only drag interaction)

**Files:**
- Create: `src/engine/geometry.ts`, `src/engine/drag.ts`
- Modify: `src/style.css` (append draggable styles)
- Test: `tests/geometry.test.ts`, `tests/drag.test.ts`

**Interfaces:**
- Consumes: `Point` type; the `#stage` element.
- Produces: `pointInPolygon(p: Point, poly: Point[]): boolean` from `geometry.ts`; `NotebookDrag` class from `drag.ts` —

```ts
constructor(opts: {
  stageEl: HTMLElement
  glowPolygon: Point[]          // the UV nightlight's glow region, stage coords
  onRevealed: () => void        // fired once when the notebook is dropped in the glow
})
show(at: Point): void           // places the draggable .notebook element
hide(): void
```

Uses pointer events (`pointerdown`/`pointermove`/`pointerup` on the stage). Task 16 wires it: visible in the bathroom when the player has the notebook and `readNotebook` is false; `onRevealed` sets `readNotebook` and plays Edith's entries.

**Coordinate note:** the stage is CSS-scaled, so client coordinates must be divided by the current scale. Use `stageEl.getBoundingClientRect()` and map `(clientX - rect.left) / (rect.width / 1280)`.

- [ ] **Step 1: Write the failing tests**

`tests/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pointInPolygon } from '../src/engine/geometry'

const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]

describe('pointInPolygon', () => {
  it('detects inside and outside points', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true)
    expect(pointInPolygon([15, 5], square)).toBe(false)
    expect(pointInPolygon([-1, -1], square)).toBe(false)
  })

  it('works for non-convex polygons', () => {
    const lShape: [number, number][] = [[0, 0], [10, 0], [10, 5], [5, 5], [5, 10], [0, 10]]
    expect(pointInPolygon([2, 8], lShape)).toBe(true)
    expect(pointInPolygon([8, 8], lShape)).toBe(false)
  })
})
```

`tests/drag.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { NotebookDrag } from '../src/engine/drag'

const glow: [number, number][] = [[600, 300], [800, 300], [800, 500], [600, 500]]

const setup = () => {
  const stageEl = document.createElement('div')
  // happy-dom: give the stage a fake layout box at 1:1 scale
  stageEl.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  const onRevealed = vi.fn()
  const drag = new NotebookDrag({ stageEl, glowPolygon: glow, onRevealed })
  return { stageEl, drag, onRevealed }
}

const pointer = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }))

describe('NotebookDrag', () => {
  it('shows and hides the notebook element', () => {
    const { stageEl, drag } = setup()
    drag.show([200, 600])
    expect(stageEl.querySelector('.notebook')).toBeTruthy()
    drag.hide()
    expect(stageEl.querySelector('.notebook')).toBeFalsy()
  })

  it('fires onRevealed when dropped inside the glow', () => {
    const { stageEl, drag, onRevealed } = setup()
    drag.show([200, 600])
    const nb = stageEl.querySelector('.notebook')!
    pointer(nb, 'pointerdown', 200, 600)
    pointer(stageEl, 'pointermove', 700, 400)
    pointer(stageEl, 'pointerup', 700, 400)
    expect(onRevealed).toHaveBeenCalledOnce()
  })

  it('does not fire when dropped outside the glow', () => {
    const { stageEl, drag, onRevealed } = setup()
    drag.show([200, 600])
    const nb = stageEl.querySelector('.notebook')!
    pointer(nb, 'pointerdown', 200, 600)
    pointer(stageEl, 'pointermove', 300, 200)
    pointer(stageEl, 'pointerup', 300, 200)
    expect(onRevealed).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/geometry.test.ts tests/drag.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/engine/geometry.ts` (standard ray-casting):

```ts
import type { Point } from '../types'

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  const [x, y] = p
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
```

Append to `src/style.css`:

```css
.notebook {
  position: absolute; width: 120px; height: 90px; z-index: 25;
  background: #4a4136; border: 1px solid #6b5f4e; border-radius: 3px;
  cursor: grab; touch-action: none;
  color: #cbbfa8; font-size: 12px; display: grid; place-items: center;
}
.notebook.dragging { cursor: grabbing; opacity: 0.9; }
```

`src/engine/drag.ts`:

```ts
import type { Point } from '../types'
import { pointInPolygon } from './geometry'
import { STAGE_W } from '../app'

export class NotebookDrag {
  private el: HTMLElement | null = null
  private dragging = false
  private revealed = false

  constructor(private opts: {
    stageEl: HTMLElement
    glowPolygon: Point[]
    onRevealed: () => void
  }) {}

  show(at: Point): void {
    if (this.el) return
    const el = document.createElement('div')
    el.className = 'notebook'
    el.textContent = 'water-damaged notebook'
    this.place(el, at)
    el.addEventListener('pointerdown', () => {
      this.dragging = true
      el.classList.add('dragging')
    })
    const stage = this.opts.stageEl
    stage.addEventListener('pointermove', this.onMove)
    stage.addEventListener('pointerup', this.onUp)
    stage.append(el)
    this.el = el
  }

  hide(): void {
    this.el?.remove()
    this.el = null
    this.opts.stageEl.removeEventListener('pointermove', this.onMove)
    this.opts.stageEl.removeEventListener('pointerup', this.onUp)
  }

  private toStage(e: MouseEvent): Point {
    const rect = this.opts.stageEl.getBoundingClientRect()
    const scale = rect.width / STAGE_W
    return [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale]
  }

  private place(el: HTMLElement, [x, y]: Point): void {
    el.style.left = `${x - 60}px`
    el.style.top = `${y - 45}px`
  }

  private onMove = (e: MouseEvent): void => {
    if (!this.dragging || !this.el) return
    this.place(this.el, this.toStage(e))
  }

  private onUp = (e: MouseEvent): void => {
    if (!this.dragging || !this.el) return
    this.dragging = false
    this.el.classList.remove('dragging')
    if (!this.revealed && pointInPolygon(this.toStage(e), this.opts.glowPolygon)) {
      this.revealed = true
      this.opts.onRevealed()
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geometry.test.ts tests/drag.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/geometry.ts src/engine/drag.ts src/style.css tests/geometry.test.ts tests/drag.test.ts
git commit -m "feat(engine): point-in-polygon helper and notebook-to-uv-light drag"
```

---

### Task 15: Audio manager (room tones, motif detune, hard silence)

**Files:**
- Create: `src/engine/audio.ts`
- Test: `tests/audio.test.ts`

**Interfaces:**
- Consumes: `RoomId`; fracture tier values from Task 9.
- Produces: `AudioManager` class —

```ts
constructor(ctxFactory?: () => AudioContext)  // injectable for tests
init(): void                       // creates AudioContext; call on first user gesture
playRoomTone(room: RoomId): void   // crossfades to that room's ambient loop
setDetuneTier(tier: 0 | 1 | 2 | 3): void  // motif playbackRate: 1 / 0.997 / 0.993 / 0.988
enterSilence(): void               // HARD mute (Look Again). Objective voice never gets audio.
exitSilence(): void
sting(id: string): void
setVolume(v: number): void         // 0..1 master
// inspectable state for tests:
state(): { room: RoomId | null; silenced: boolean; detune: number; volume: number }
```

Placeholder synthesis: each room tone is a low sine + filtered noise-ish hum at a room-specific frequency (entry 55Hz, living 50Hz, kitchen 60Hz, bathroom 48Hz, bedroom 44Hz); the motif is a slow 4-note oscillator arpeggio. Real audio files can replace synthesis later behind the same API. All logic (which loop, silence, detune, volume) must live in plain state so it is testable without a real `AudioContext`.

- [ ] **Step 1: Write the failing tests**

`tests/audio.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { AudioManager } from '../src/engine/audio'

// Minimal AudioContext stub — just enough surface for the manager.
const makeStubCtx = () => {
  const gain = () => ({
    gain: { value: 1, setTargetAtTime: () => {} },
    connect: () => {},
  })
  return {
    createGain: gain,
    createOscillator: () => ({
      type: 'sine', frequency: { value: 0 }, playbackRate: { value: 1 },
      connect: () => {}, start: () => {}, stop: () => {},
    }),
    createBiquadFilter: () => ({ type: 'lowpass', frequency: { value: 0 }, connect: () => {} }),
    destination: {}, currentTime: 0,
  } as unknown as AudioContext
}

describe('AudioManager', () => {
  const make = () => {
    const a = new AudioManager(() => makeStubCtx())
    a.init()
    return a
  }

  it('tracks the current room tone', () => {
    const a = make()
    expect(a.state().room).toBeNull()
    a.playRoomTone('living')
    expect(a.state().room).toBe('living')
  })

  it('hard silence mutes and exit restores', () => {
    const a = make()
    a.setVolume(0.8)
    a.enterSilence()
    expect(a.state().silenced).toBe(true)
    a.exitSilence()
    expect(a.state().silenced).toBe(false)
    expect(a.state().volume).toBe(0.8)
  })

  it('maps fracture tiers to detune rates', () => {
    const a = make()
    a.setDetuneTier(0)
    expect(a.state().detune).toBe(1)
    a.setDetuneTier(2)
    expect(a.state().detune).toBe(0.993)
    a.setDetuneTier(3)
    expect(a.state().detune).toBe(0.988)
  })

  it('is safe to call before init (no-ops, no throw)', () => {
    const a = new AudioManager(() => makeStubCtx())
    expect(() => {
      a.playRoomTone('entry')
      a.enterSilence()
      a.sting('shutter')
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/audio.test.ts`
Expected: FAIL — cannot resolve `../src/engine/audio`.

- [ ] **Step 3: Implement**

`src/engine/audio.ts`:

```ts
import type { RoomId } from '../types'

const ROOM_FREQ: Record<RoomId, number> = {
  entry: 55, living: 50, kitchen: 60, bathroom: 48, bedroom: 44,
}
const DETUNE: Record<0 | 1 | 2 | 3, number> = { 0: 1, 1: 0.997, 2: 0.993, 3: 0.988 }

export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private toneOsc: OscillatorNode | null = null
  private room: RoomId | null = null
  private silenced = false
  private detune = 1
  private volume = 1

  constructor(private ctxFactory: () => AudioContext = () => new AudioContext()) {}

  init(): void {
    if (this.ctx) return
    this.ctx = this.ctxFactory()
    this.master = this.ctx.createGain()
    this.master.connect(this.ctx.destination)
    this.applyGain()
  }

  state() {
    return { room: this.room, silenced: this.silenced, detune: this.detune, volume: this.volume }
  }

  playRoomTone(room: RoomId): void {
    this.room = room
    if (!this.ctx || !this.master) return
    this.toneOsc?.stop()
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = ROOM_FREQ[room]
    const g = this.ctx.createGain()
    g.gain.value = 0.05
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    this.toneOsc = osc
  }

  setDetuneTier(tier: 0 | 1 | 2 | 3): void {
    this.detune = DETUNE[tier]
    // OscillatorNode has no playbackRate in the DOM types; the placeholder synth
    // fakes one so the real AudioBufferSourceNode loop is a drop-in later.
    if (this.toneOsc) (this.toneOsc as any).playbackRate.value = this.detune
  }

  enterSilence(): void { this.silenced = true; this.applyGain() }
  exitSilence(): void { this.silenced = false; this.applyGain() }

  setVolume(v: number): void { this.volume = v; this.applyGain() }

  sting(_id: string): void {
    if (!this.ctx || !this.master || this.silenced) return
    const osc = this.ctx.createOscillator()
    osc.frequency.value = 220
    const g = this.ctx.createGain()
    g.gain.value = 0.1
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop((this.ctx.currentTime ?? 0) + 0.3)
  }

  private applyGain(): void {
    if (this.master) this.master.gain.value = this.silenced ? 0 : this.volume
  }
}
```

Note: `OscillatorNode.playbackRate` does not exist on real oscillators (`detune` does) — but the placeholder motif is oscillator-based and the stub accepts it; when real audio files land, the loop becomes an `AudioBufferSourceNode` where `playbackRate` is correct. Keep the field name `playbackRate` so the swap is a drop-in. If TypeScript complains, cast the node to `any` at the single assignment site.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/audio.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/audio.ts tests/audio.test.ts
git commit -m "feat(engine): audio manager with room tones, detune tiers, hard silence"
```

---

### Task 16: Full game content + placeholder plates + boot wiring

This task makes the whole game playable end-to-end with placeholder copy and generated placeholder photos. All 5 rooms, ~35 hotspots, 7 fractures, 3 items, all puzzles and locks from spec §5.

**Fracture ledger (canonical, human-editable later):**

| id | where | lie (Examine) | truth (Look Again) |
|----|-------|----------------|--------------------|
| f1 | entry / shoe-mat | "just my old boots" | two sets of shoes, both recently worn |
| f2 | living / reading-chair | "at peace, tea by the window" | chair faces the wall; scratches; drag tracks |
| f3 | living / photo-wall | narrates a photo that "is" in the empty frame | one frame is empty |
| f4 | kitchen puzzle | "I visited every week" | calendar contradicts visit dates |
| f5 | kitchen puzzle | "she lived alone" | two sets of dishes; food eaten after death |
| f6 | bathroom / medicine-cabinet | "she took her pills, she was fine" | pill organizer full, weeks untouched |
| f7 | bedroom / bed | "just storage in here" | bed made, slept-in recently |

**Files:**
- Create: `tools/gen-placeholders.mjs`, `public/game.json`, `src/data/load.ts`
- Modify: `src/main.ts` (full boot wiring), `src/style.css` (cursor + fade-in)
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–15.
- Produces: `loadGame(url: string): Promise<GameData>` from `src/data/load.ts`; the canonical `public/game.json`; a playable `npm run dev` build. Flag vocabulary used by content (Tasks 17–18 depend on these exact names): `playedMachine`, `examined:calendar`, `examined:fridge`, `examined:dishes`, `solved:kitchen-timeline`, `readNotebook`, `tookPhoto`.

- [ ] **Step 1: Placeholder plate generator**

`tools/gen-placeholders.mjs`:

```js
import { mkdirSync, writeFileSync } from 'node:fs'

const plates = [
  ['entry-base', '#2a2622', 'ENTRY HALL'],
  ['living-base', '#2d2823', 'LIVING ROOM'],
  ['living-shift3', '#2d2620', 'LIVING ROOM — hallway light changed'],
  ['kitchen-base', '#282a24', 'KITCHEN'],
  ['bathroom-base', '#232629', 'BATHROOM'],
  ['bathroom-shift5', '#212327', 'BATHROOM — dimmer'],
  ['bedroom-base', '#262229', 'SECOND BEDROOM'],
  ['bedroom-shift7', '#231f27', 'SECOND BEDROOM — door now ajar'],
  ['polaroid-photo', '#1c1a17', 'POLAROID — two shadows'],
]

mkdirSync('public/photos', { recursive: true })
for (const [name, bg, label] of plates) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="${bg}"/>
  <text x="640" y="360" fill="#7d7468" font-size="40" text-anchor="middle"
        font-family="Georgia">${label}</text>
  <text x="640" y="410" fill="#55504a" font-size="18" text-anchor="middle"
        font-family="Georgia">placeholder plate — replace with photo</text>
</svg>`
  writeFileSync(`public/photos/${name}.svg`, svg)
}
console.log(`wrote ${plates.length} placeholder plates`)
```

Run: `node tools/gen-placeholders.mjs`
Expected: `wrote 9 placeholder plates`.

- [ ] **Step 2: Write the failing content test**

`tests/content.test.ts` (node environment — reads the real file):

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateGameData } from '../src/data/validate'
import type { GameData } from '../src/types'

const game = JSON.parse(readFileSync('public/game.json', 'utf8')) as GameData

describe('public/game.json', () => {
  it('passes structural validation', () => {
    expect(validateGameData(game)).toEqual([])
  })

  it('has 5 rooms and exactly 7 canonical fractures', () => {
    expect(game.rooms.length).toBe(5)
    expect(game.fractureIds.length).toBe(7)
  })

  it('has ~35 hotspots and every referenced plate file exists', () => {
    const count = game.rooms.reduce((n, r) => n + r.hotspots.length, 0)
    expect(count).toBeGreaterThanOrEqual(30)
    for (const room of game.rooms)
      for (const plate of room.plates)
        expect(() => readFileSync(`public/${plate.src}`)).not.toThrow()
  })

  it('gates rooms per the dependency graph', () => {
    const exitOf = (from: string, to: string) =>
      game.rooms.find(r => r.id === from)!.exits.find(x => x.to === to)!
    expect(exitOf('living', 'kitchen').unlockedWhen).toEqual([{ kind: 'flag', name: 'playedMachine' }])
    expect(exitOf('kitchen', 'bathroom').unlockedWhen).toEqual([{ kind: 'flag', name: 'solved:kitchen-timeline' }])
    expect(exitOf('bathroom', 'bedroom').unlockedWhen).toEqual([
      { kind: 'hasItem', item: 'keyring' },
      { kind: 'flag', name: 'readNotebook' },
    ])
  })

  it('finale demands 5 fractures for the accusation', () => {
    expect(game.finale.minFractures).toBe(5)
  })
})
```

Run: `npx vitest run tests/content.test.ts` — Expected: FAIL (no `public/game.json`).

- [ ] **Step 3: Author `public/game.json`**

All prose below is placeholder copy in the right *shape* (Mara warm/first-person vs objective clipped/second-person). Polygons are provisional rectangles; they get re-traced over the real photographs later. Full file:

```json
{
  "startRoom": "entry",
  "fractureIds": ["f1", "f2", "f3", "f4", "f5", "f6", "f7"],
  "fractureShifts": [
    { "at": 3, "effects": [{ "kind": "setPlate", "room": "living", "plate": "shift3" }] },
    { "at": 5, "effects": [{ "kind": "setPlate", "room": "bathroom", "plate": "shift5" }] },
    { "at": 7, "effects": [{ "kind": "setPlate", "room": "bedroom", "plate": "shift7" }, { "kind": "sting", "id": "seven" }] }
  ],
  "puzzles": [
    {
      "id": "kitchen-timeline",
      "requiresFlags": ["examined:calendar", "examined:fridge", "examined:dishes"],
      "onSolve": [
        { "kind": "registerFracture", "id": "f4" },
        { "kind": "registerFracture", "id": "f5" },
        { "kind": "sting", "id": "realization" }
      ]
    }
  ],
  "drag": {
    "room": "bathroom",
    "item": "notebook",
    "spawnAt": [200, 620],
    "glowPolygon": [[820, 400], [1020, 400], [1020, 580], [820, 580]],
    "revealedFlag": "readNotebook",
    "revealText": "EDITH'S HAND, UNDER THE VIOLET LIGHT: 'She came again today. I counted the knives after she left. I am not being dramatic. I counted them twice.' [PLACEHOLDER — Edith counter-narration sequence]",
    "onRevealed": [{ "kind": "setFlag", "name": "readNotebook" }, { "kind": "sting", "id": "revealed" }]
  },
  "rooms": [
    {
      "id": "entry",
      "name": "Entry Hall",
      "plates": [{ "id": "base", "src": "photos/entry-base.svg" }],
      "hotspots": [
        { "id": "coat-rack", "polygon": [[80,150],[220,150],[220,520],[80,520]],
          "examine": "Her coat rack. She never owned enough coats to fill it. [PLACEHOLDER]",
          "lookAgain": "A coat rack. Four hooks, all worn." },
        { "id": "mail-pile", "polygon": [[300,480],[520,480],[520,600],[300,600]],
          "examine": "The mail's been piling up. Bills, mostly. I should have come sooner. [PLACEHOLDER]",
          "lookAgain": "Unopened mail. The postmarks span eleven weeks." },
        { "id": "light-switch", "polygon": [[600,300],[650,300],[650,380],[600,380]],
          "examine": "The hallway light. It always flickered. Edith found it charming. [PLACEHOLDER]",
          "lookAgain": "A light switch. The plate around it is clean; the wall is not." },
        { "id": "shoe-mat", "polygon": [[700,560],[950,560],[950,680],[700,680]],
          "examine": "Just my old boots. I left them here years ago and she kept them. Sentimental. [PLACEHOLDER LIE]",
          "lookAgain": "Two pairs of shoes, different sizes. Both have fresh mud at the heel.",
          "fractureId": "f1" }
      ],
      "exits": [
        { "to": "living", "polygon": [[1080,180],[1280,180],[1280,620],[1080,620]] }
      ]
    },
    {
      "id": "living",
      "name": "Living Room",
      "plates": [
        { "id": "base", "src": "photos/living-base.svg" },
        { "id": "shift3", "src": "photos/living-shift3.svg" }
      ],
      "hotspots": [
        { "id": "reading-chair", "polygon": [[420,320],[640,320],[640,560],[420,560]],
          "examine": "Edith's reading chair. She'd sit here every night with her tea. She was so at peace in this apartment. [PLACEHOLDER LIE]",
          "examineTiered": [{ "tier": 1, "text": "The chair again? It's just a chair, sweetheart. [PLACEHOLDER DEFENSIVE]" }],
          "lookAgain": "A chair facing the wall, not the window. Deep scratches on the armrests. The floor beneath is worn through the varnish in two parallel tracks.",
          "fractureId": "f2" },
        { "id": "chair-cushion", "polygon": [[460,400],[600,400],[600,470],[460,470]],
          "examine": "The cushion's gone flat. She really did live in this chair. [PLACEHOLDER]",
          "lookAgain": "Something rigid under the cushion. A key ring: five keys.",
          "onLookAgain": [{ "kind": "addItem", "item": "keyring" }, { "kind": "sting", "id": "found" }] },
        { "id": "floor-tracks", "polygon": [[400,570],[660,570],[660,640],[400,640]],
          "examine": "The floors need refinishing. Old buildings. [PLACEHOLDER — hints at cushion]",
          "lookAgain": "Two parallel gouges run from the chair to the wall. Something heavy was dragged, many times. They pass under the chair cushion." },
        { "id": "photo-wall", "polygon": [[700,120],[1050,120],[1050,420],[700,420]],
          "examine": "Our photo wall. That's us at the lake house — she's laughing because I'd just dropped the thermos. God, that day. [PLACEHOLDER LIE]",
          "examineTiered": [{ "tier": 1, "text": "You've seen the photos already. Why do you keep counting them? [PLACEHOLDER DEFENSIVE]" }],
          "lookAgain": "Six frames. Five photographs. The sixth frame is empty; its glass is clean except for four fingerprints.",
          "fractureId": "f3" },
        { "id": "answering-machine", "polygon": [[120,480],[300,480],[300,580],[120,580]],
          "examine": "The answering machine, blinking away. Let's hear it... 'Edith, it's the pharmacy again—' Old messages. Nothing important. [PLACEHOLDER — plays machine]",
          "lookAgain": "Fourteen messages. Thirteen are from the same number. The counter says they were played before, all of them, recently.",
          "onExamine": [{ "kind": "setFlag", "name": "playedMachine" }] },
        { "id": "telephone", "polygon": [[120,400],[260,400],[260,470],[120,470]],
          "examine": "Her old phone. She refused a mobile. I called every Sunday. [PLACEHOLDER]",
          "lookAgain": "A corded phone. The emergency numbers card beside it has a new number written over an old one, in different ink." },
        { "id": "tea-cup", "polygon": [[660,470],[730,470],[730,540],[660,540]],
          "examine": "Her teacup, still out. Chamomile, always. I can almost smell it. [PLACEHOLDER]",
          "lookAgain": "A cup with a dried ring inside. It smells of nothing." },
        { "id": "bookshelf", "polygon": [[60,120],[350,120],[350,380],[60,380]],
          "examine": "Her books. Mysteries, mostly. She always guessed the ending by chapter three. [PLACEHOLDER]",
          "lookAgain": "The mysteries are shelved spine-in for one full row. Someone did not want those titles read." },
        { "id": "window", "polygon": [[900,440],[1060,440],[1060,620],[900,620]],
          "examine": "The window she loved. South light all afternoon. [PLACEHOLDER]",
          "lookAgain": "The curtain hem is nailed to the sill." },
        { "id": "last-box", "polygon": [[780,560],[900,560],[900,660],[780,660]],
          "examine": "The packing boxes. We're nearly done, you and I. [PLACEHOLDER]",
          "lookAgain": "A packing box, half-filled. The tape gun is warm." }
      ],
      "exits": [
        { "to": "entry", "polygon": [[0,180],[60,180],[60,620],[0,620]] },
        { "to": "kitchen", "polygon": [[1080,180],[1280,180],[1280,620],[1080,620]],
          "unlockedWhen": [{ "kind": "flag", "name": "playedMachine" }],
          "lockedText": "The kitchen can wait. I want to finish in here first. Play her messages — you should hear her friends' voices. [PLACEHOLDER LOCK]" }
      ]
    },
    {
      "id": "kitchen",
      "name": "Kitchen",
      "plates": [{ "id": "base", "src": "photos/kitchen-base.svg" }],
      "hotspots": [
        { "id": "calendar", "polygon": [[100,140],[320,140],[320,420],[100,420]],
          "examine": "Her wall calendar. Look — 'Mara visits' every single week, in her handwriting. We were close like that. [PLACEHOLDER LIE — puzzle 1/3]",
          "lookAgain": "A calendar in two hands. The 'Mara visits' entries continue for six weeks past the date on the memorial card taped to the fridge.",
          "onExamine": [{ "kind": "setFlag", "name": "examined:calendar" }] },
        { "id": "fridge", "polygon": [[360,120],[560,120],[560,620],[360,620]],
          "examine": "I should empty the fridge before it turns. She always kept it stocked for guests. [PLACEHOLDER — puzzle 2/3]",
          "lookAgain": "Milk dated two weeks ago. Eggs, half gone. Someone has been shopping. Someone has been eating.",
          "onExamine": [{ "kind": "setFlag", "name": "examined:fridge" }] },
        { "id": "drying-rack", "polygon": [[620,380],[820,380],[820,520],[620,520]],
          "examine": "One plate, one cup — she ate alone, poor thing. I hate that she ate alone. [PLACEHOLDER LIE — puzzle 3/3]",
          "lookAgain": "Two plates. Two cups. Two forks, still wet.",
          "onExamine": [{ "kind": "setFlag", "name": "examined:dishes" }] },
        { "id": "pill-organizer", "polygon": [[860,300],[1000,300],[1000,380],[860,380]],
          "examine": "Her pills. The doctors kept changing the dosage. She managed it all herself, so organized. [PLACEHOLDER]",
          "lookAgain": "A seven-day organizer, all fourteen lids closed, all fourteen wells full. Dust on the Monday lid." },
        { "id": "kettle", "polygon": [[640,280],[760,280],[760,360],[640,360]],
          "examine": "The kettle. Chamomile, always chamomile. [PLACEHOLDER]",
          "lookAgain": "The kettle is descaled and full. The chamomile box is empty; the coffee jar beside it is new." },
        { "id": "junk-drawer", "polygon": [[860,440],[1040,440],[1040,540],[860,540]],
          "examine": "Every kitchen has one drawer like this. Batteries, string, takeaway menus. Nothing worth keeping. [PLACEHOLDER — notebook found here]",
          "lookAgain": "Under the menus: a notebook, warped by water. The cover says E. in pencil. Most pages are illegible — the ink only ghosts.",
          "onLookAgain": [{ "kind": "addItem", "item": "notebook" }, { "kind": "sting", "id": "found" }] }
      ],
      "exits": [
        { "to": "living", "polygon": [[0,180],[60,180],[60,620],[0,620]] },
        { "to": "bathroom", "polygon": [[1080,180],[1280,180],[1280,620],[1080,620]],
          "unlockedWhen": [{ "kind": "flag", "name": "solved:kitchen-timeline" }],
          "lockedText": "There's nothing in the bathroom but sad little bottles. Stay with me here a moment — look at her calendar, her fridge, her dishes. Help me remember her properly. [PLACEHOLDER LOCK]" }
      ]
    },
    {
      "id": "bathroom",
      "name": "Bathroom",
      "plates": [
        { "id": "base", "src": "photos/bathroom-base.svg" },
        { "id": "shift5", "src": "photos/bathroom-shift5.svg" }
      ],
      "hotspots": [
        { "id": "uv-nightlight", "polygon": [[840,420],[1000,420],[1000,560],[840,560]],
          "examine": "Her little violet nightlight. For her eyes, she said. It made the whole room glow like a bruise. [PLACEHOLDER — drag target]",
          "lookAgain": "A UV nightlight, plugged in, warm. Under its glow, the grout shows handprints the overhead light cannot see." },
        { "id": "medicine-cabinet", "polygon": [[520,140],[720,140],[720,360],[520,360]],
          "examine": "Her medicine cabinet. She was on top of all of it — I made sure. I'd count the pills with her on Sundays. [PLACEHOLDER LIE]",
          "examineTiered": [{ "tier": 2, "text": "You keep looking at everything twice. Edith used to do that. [PLACEHOLDER META]" }],
          "lookAgain": "Prescription bottles, unopened, seals intact. The fill dates stop eleven weeks ago.",
          "fractureId": "f6" },
        { "id": "sink", "polygon": [[520,400],[720,400],[720,560],[520,560]],
          "examine": "Her sink. One toothbrush, see? Just hers. [PLACEHOLDER]",
          "lookAgain": "One toothbrush, bone dry. The soap bar is worn to a sliver and still slick." },
        { "id": "towels", "polygon": [[160,300],[380,300],[380,560],[160,560]],
          "examine": "Fresh towels. She kept a proper home to the very end. [PLACEHOLDER]",
          "lookAgain": "Two towels on the rail. One is damp." },
        { "id": "mirror", "polygon": [[540,60],[700,60],[700,130],[540,130]],
          "examine": "The mirror. I look tired. This week has been so hard. [PLACEHOLDER]",
          "lookAgain": "A mirror. It shows the room behind you. The door in the reflection is open wider than the door." }
      ],
      "exits": [
        { "to": "kitchen", "polygon": [[0,180],[60,180],[60,620],[0,620]] },
        { "to": "bedroom", "polygon": [[1080,180],[1280,180],[1280,620],[1080,620]],
          "unlockedWhen": [{ "kind": "hasItem", "item": "keyring" }, { "kind": "flag", "name": "readNotebook" }],
          "lockedText": "That's just storage, sweetheart. Boxes and dust. There's nothing of Edith in there. [PLACEHOLDER LOCK — the biggest lie]" }
      ]
    },
    {
      "id": "bedroom",
      "name": "Second Bedroom",
      "plates": [
        { "id": "base", "src": "photos/bedroom-base.svg" },
        { "id": "shift7", "src": "photos/bedroom-shift7.svg" }
      ],
      "hotspots": [
        { "id": "bed", "polygon": [[380,320],[760,320],[760,600],[380,600]],
          "examine": "See? Storage. That old bed is just for guests we never had. [PLACEHOLDER LIE]",
          "lookAgain": "A made bed. The pillow holds the shape of a head. The sheets smell of detergent — washed this week.",
          "fractureId": "f7" },
        { "id": "laundry", "polygon": [[820,460],[1000,460],[1000,620],[820,620]],
          "examine": "Old dust sheets, probably. I'll sort them later. [PLACEHOLDER]",
          "lookAgain": "A laundry basket. Folded clothes, adult-sized, none of them Edith's style. The top shirt is inside out, the way someone in a hurry undresses." },
        { "id": "closet", "polygon": [[100,140],[320,140],[320,600],[100,600]],
          "examine": "Boxes. I told you — storage. [PLACEHOLDER]",
          "lookAgain": "A rail of hangers, half empty. On the floor, a sleeping bag, rolled tight, recently used." },
        { "id": "desk", "polygon": [[820,180],[1060,180],[1060,420],[820,420]],
          "examine": "Edith's old sewing desk. She never touched it in years. [PLACEHOLDER]",
          "lookAgain": "A desk. In the drawer-well, a Polaroid camera. The counter window shows 1.",
          "onLookAgain": [{ "kind": "addItem", "item": "polaroid" }, { "kind": "sting", "id": "found" }] },
        { "id": "doorway-view", "polygon": [[420,80],[860,80],[860,280],[420,280]],
          "visibleWhen": [{ "kind": "hasItem", "item": "polaroid" }],
          "examine": "Take a picture, then. If it helps you say goodbye. Use the last one. Frame it kindly. [PLACEHOLDER — takes the photo, starts finale]",
          "lookAgain": "Through the viewfinder the room is smaller. You press the shutter. The camera whines and gives up its last photograph, blank and developing.",
          "onLookAgain": [{ "kind": "setFlag", "name": "tookPhoto" }, { "kind": "sting", "id": "shutter" }, { "kind": "startFinale" }] }
      ],
      "exits": [
        { "to": "bathroom", "polygon": [[0,180],[60,180],[60,620],[0,620]] }
      ]
    }
  ],
  "finale": {
    "beats": [
      "So now you know the whole of it. She was tired, and she was ill, and she went gently, in her own bed, in her own time. [PLACEHOLDER BEAT 1]",
      "I visited every week. I brought her tea. I counted her pills. Nobody could have done more for her than I did. [PLACEHOLDER BEAT 2]",
      "And I am certain — certain — that she never spent one night of her life afraid. [PLACEHOLDER BEAT 3 — accusation word lives here]"
    ],
    "accuseBeatIndex": 2,
    "accuseWord": "afraid",
    "minFractures": 5,
    "endingA": [
      "You pack the last box. Mara thanks you for helping her say goodbye. [PLACEHOLDER]",
      "Over the credits, the Polaroid develops. The framing is wrong. There are two shadows. [PLACEHOLDER STINGER]"
    ],
    "endingB": {
      "corrupt": [
        ["She went gently—", "The chair faced the door."],
        ["I visited every week—", "The calendar kept counting after she stopped."],
        ["I am Mara. I am—", "The second bed is warm."]
      ],
      "mirrorLookAgain": "A mirror. You look again. [PLACEHOLDER — final objective description, writing pass required. Design requirement: the only objective description the player wishes had been narration.]"
    }
  }
}
```

- [ ] **Step 4: Loader**

`src/data/load.ts`:

```ts
import type { GameData } from '../types'
import { validateGameData } from './validate'

export async function loadGame(url: string): Promise<GameData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`)
  const game = (await res.json()) as GameData
  const errors = validateGameData(game)
  if (errors.length > 0) throw new Error(`invalid game data:\n${errors.join('\n')}`)
  return game
}
```

- [ ] **Step 5: Boot wiring**

Replace `src/main.ts`:

```ts
import { createStage } from './app'
import { loadGame } from './data/load'
import { Store, makeInitialState, fractureTier } from './state/store'
import { pickAdapter } from './state/persist'
import { Stage } from './engine/stage'
import { HotspotLayer } from './engine/hotspots'
import { TextBox } from './engine/textbox'
import { FractureSystem } from './engine/fractures'
import { InteractionController } from './engine/interactions'
import { RoomManager } from './engine/rooms'
import { PuzzleWatcher } from './engine/puzzles'
import { NotebookDrag } from './engine/drag'
import { AudioManager } from './engine/audio'
import { InventoryView } from './ui/inventory'
import { runEffects, type EffectContext } from './engine/effects'
import type { Hotspot } from './types'

async function boot() {
  const root = document.getElementById('root')!
  const stageEl = createStage(root)
  const game = await loadGame('game.json')

  const adapter = await pickAdapter()
  const saved = await adapter.load()
  const store = new Store(saved ?? makeInitialState(game.startRoom))
  const autosave = () => { void adapter.save(store.snapshot()) }

  const stage = new Stage(stageEl)
  const textBox = new TextBox(stageEl)
  const audio = new AudioManager()
  const fractures = new FractureSystem(store, game.fractureShifts)
  new InventoryView(stageEl, store)

  const hotspotById = new Map<string, Hotspot>()
  for (const room of game.rooms) for (const h of room.hotspots) hotspotById.set(h.id, h)

  const ctx: EffectContext = {
    store,
    goToRoom: room => { void rooms.enter(room).then(autosave) },
    setPlate: (room, plateId) => {
      store.setPlateOverride(room, plateId)
      if (store.currentRoom() === room) void rooms.refreshPlate()
    },
    playSting: id => audio.sting(id),
    registerFracture: id => fractures.register(id),
    startFinale: () => { void import('./engine/finale').then(m => new m.Finale({ store, textBox, stage, game, audio }).start()) },
  }
  fractures.setContext(ctx)

  const controller = new InteractionController({
    textBox, fractures, ctx,
    hooks: {
      onExamineShown: () => audio.exitSilence(),
      onLookAgainShown: () => audio.enterSilence(),
    },
  })

  const hotspots = new HotspotLayer(stageEl, {
    onHotspot: id => {
      const h = hotspotById.get(id)
      if (h) controller.handleHotspotClick(h)
    },
    onExit: to => rooms.handleExitClick(to),
  })

  const rooms = new RoomManager({
    game, store, stage, hotspots, textBox, autosave,
    onRoomEntered: room => {
      audio.playRoomTone(room.id)
      audio.setDetuneTier(fractureTier(store.fractureCount()))
      syncBathroomDrag(room.id)
    },
  })

  new PuzzleWatcher(store, game.puzzles, ctx).start()

  // The game's only drag interaction, fully described by game.drag (so the
  // Task 17 simulator can model it from data alone)
  const dragCfg = game.drag
  const drag = dragCfg
    ? new NotebookDrag({
        stageEl,
        glowPolygon: dragCfg.glowPolygon,
        onRevealed: () => {
          runEffects(dragCfg.onRevealed, ctx)
          drag!.hide()
          void textBox.showNarration('notebook', dragCfg.revealText)
          autosave()
        },
      })
    : null
  const syncBathroomDrag = (roomId: string) => {
    if (!drag || !dragCfg) return
    if (roomId === dragCfg.room && store.hasItem(dragCfg.item) && !store.getFlag(dragCfg.revealedFlag)) {
      drag.show(dragCfg.spawnAt)
    } else {
      drag.hide()
    }
  }
  store.subscribe(() => syncBathroomDrag(store.currentRoom()))

  // Detune reacts to fracture count as it grows
  store.subscribe(() => audio.setDetuneTier(fractureTier(store.fractureCount())))

  // Audio needs a user gesture; breathe mode on space (toggle wired properly in Task 19)
  stageEl.addEventListener('click', () => audio.init(), { once: true })
  window.addEventListener('keydown', e => { if (e.code === 'Space') hotspots.setBreathe(true) })
  window.addEventListener('keyup', e => { if (e.code === 'Space') hotspots.setBreathe(false) })

  await rooms.enter(store.currentRoom())
}

void boot()
```

- [ ] **Step 6: Run all tests + manual playthrough**

Run: `npx vitest run` — Expected: all suites pass, including `tests/content.test.ts`.
Run: `npm run dev`, then click through: entry → living (play machine) → kitchen (calendar/fridge/dishes) → bathroom (drag notebook into glow) → find keyring under cushion → bedroom → camera → photo. Confirm the whole chain works with placeholder plates.

- [ ] **Step 7: Commit**

```bash
git add public/ tools/gen-placeholders.mjs src/data/load.ts src/main.ts src/style.css tests/content.test.ts
git commit -m "feat(content): full five-room game.json, placeholder plates, boot wiring"
```

**Note:** `main.ts` imports `./engine/finale` dynamically — that module lands in Task 18. Until then, `startFinale` will fail at runtime in the bedroom only; every test still passes. If the executor wants strict ordering, swap Tasks 17 and 18.

---

### Task 17: Headless validator (prove the game is completable)

Spec §9: a validator that walks the dependency graph and proves (a) both endings reachable, (b) no hotspot unreachable, (c) all seven fractures collectible before the finale.

**Files:**
- Create: `src/tools/reachability.ts`, `tools/validate.ts`
- Test: `tests/reachability.test.ts`

**Interfaces:**
- Consumes: `GameData`; `Store`/`makeInitialState`; `FractureSystem`; `runEffects`, `checkConditions`, `EffectContext`. Reuses the *real* engine logic headlessly — the simulation and the game cannot drift apart.
- Produces:

```ts
export interface SimReport {
  reachedRooms: string[]
  examinedHotspots: string[]
  unreachableHotspots: string[]
  fractures: string[]
  endingAReachable: boolean   // finale started
  endingBReachable: boolean   // finale started with fractureCount >= minFractures
  errors: string[]            // human-readable failures of (a)/(b)/(c)
}
export function simulate(game: GameData): SimReport
```

`npm run validate` runs schema validation + simulation over `public/game.json` and exits non-zero on any error.

- [ ] **Step 1: Write the failing tests**

`tests/reachability.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { simulate } from '../src/tools/reachability'
import { makeTinyGame } from './fixtures'
import type { GameData } from '../src/types'

describe('simulate — tiny fixture', () => {
  it('reaches both rooms, collects the fracture, reaches both endings', () => {
    const r = simulate(makeTinyGame())
    expect(r.reachedRooms.sort()).toEqual(['entry', 'living'])
    expect(r.fractures).toEqual(['f1'])
    expect(r.unreachableHotspots).toEqual([])
    expect(r.endingAReachable).toBe(true)
    expect(r.endingBReachable).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('reports an unreachable ending when the finale trigger is removed', () => {
    const g = makeTinyGame()
    delete g.rooms[1]!.hotspots[0]!.onLookAgain
    const r = simulate(g)
    expect(r.endingAReachable).toBe(false)
    expect(r.errors.join()).toMatch(/ending a/i)
  })

  it('reports uncollectible fractures', () => {
    const g = makeTinyGame()
    g.fractureIds.push('f-orphan')
    const r = simulate(g)
    expect(r.errors.join()).toMatch(/f-orphan/)
  })
})

describe('simulate — real content', () => {
  const game = JSON.parse(readFileSync('public/game.json', 'utf8')) as GameData

  it('proves the shipped game.json is completable', () => {
    const r = simulate(game)
    expect(r.errors).toEqual([])
    expect(r.reachedRooms.length).toBe(5)
    expect(r.fractures.length).toBe(7)
    expect(r.unreachableHotspots).toEqual([])
    expect(r.endingAReachable).toBe(true)
    expect(r.endingBReachable).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/reachability.test.ts`
Expected: FAIL — cannot resolve `../src/tools/reachability`.

- [ ] **Step 3: Implement**

`src/tools/reachability.ts`:

```ts
import type { GameData, RoomId } from '../types'
import { Store, makeInitialState } from '../state/store'
import { FractureSystem } from '../engine/fractures'
import { checkConditions, runEffects, type EffectContext } from '../engine/effects'

export interface SimReport {
  reachedRooms: string[]
  examinedHotspots: string[]
  unreachableHotspots: string[]
  fractures: string[]
  endingAReachable: boolean
  endingBReachable: boolean
  errors: string[]
}

/**
 * Plays an exhaustive, greedy playthrough: in every reachable room, examine and
 * look-again everything visible, let puzzles solve, walk every unlocked exit.
 * Loops to fixpoint because flags/items unlock new hotspots, exits, and rooms.
 */
export function simulate(game: GameData): SimReport {
  const store = new Store(makeInitialState(game.startRoom))
  const fractures = new FractureSystem(store, game.fractureShifts)
  const reached = new Set<RoomId>([game.startRoom])
  const examined = new Set<string>()
  let finaleStarted = false
  let fracturesAtFinale = 0

  const ctx: EffectContext = {
    store,
    goToRoom: room => { reached.add(room) },
    setPlate: () => {},
    playSting: () => {},
    registerFracture: id => fractures.register(id),
    startFinale: () => {
      if (!finaleStarted) fracturesAtFinale = store.fractureCount()
      finaleStarted = true
    },
  }
  fractures.setContext(ctx)

  const checkPuzzles = () => {
    for (const p of game.puzzles) {
      const flag = `solved:${p.id}`
      if (!store.getFlag(flag) && p.requiresFlags.every(f => store.getFlag(f))) {
        store.setFlag(flag)
        runEffects(p.onSolve, ctx)
      }
    }
  }

  let changed = true
  let guard = 0
  while (changed && guard++ < 100) {
    changed = false
    for (const room of game.rooms) {
      if (!reached.has(room.id)) continue
      for (const h of room.hotspots) {
        if (!checkConditions(h.visibleWhen, store)) continue
        if (!examined.has(h.id)) {
          examined.add(h.id)
          changed = true
        }
        // re-run interactions every pass; effects are idempotent through flags
        fractures.noteExamine(h)
        runEffects(h.onExamine, ctx)
        fractures.noteLookAgain(h)
        runEffects(h.onLookAgain, ctx)
        checkPuzzles()
      }
      for (const exit of room.exits) {
        if (checkConditions(exit.unlockedWhen, store) && !reached.has(exit.to)) {
          reached.add(exit.to)
          changed = true
        }
      }
    }
    // Model the drag interaction: a player in the drag room holding the item
    // will complete the reveal (it is the room's only forward move).
    const drag = game.drag
    if (drag && !store.getFlag(drag.revealedFlag) && reached.has(drag.room) && store.hasItem(drag.item)) {
      runEffects(drag.onRevealed, ctx)
      changed = true
    }
  }

  const allHotspots = game.rooms.flatMap(r => r.hotspots.map(h => h.id))
  const unreachable = allHotspots.filter(id => !examined.has(id))
  const collected = store.fractureIds()
  const missing = game.fractureIds.filter(id => !collected.includes(id))
  const endingB = finaleStarted && fracturesAtFinale >= game.finale.minFractures

  const errors: string[] = []
  if (!finaleStarted) errors.push('Ending A unreachable: no path starts the finale')
  if (!endingB) errors.push(`Ending B unreachable: only ${fracturesAtFinale} fractures collectible before finale (need ${game.finale.minFractures})`)
  for (const id of missing) errors.push(`fracture ${id} is not collectible`)
  for (const id of unreachable) errors.push(`hotspot ${id} is unreachable`)

  return {
    reachedRooms: [...reached],
    examinedHotspots: [...examined],
    unreachableHotspots: unreachable,
    fractures: collected,
    endingAReachable: finaleStarted,
    endingBReachable: endingB,
    errors,
  }
}
```

`tools/validate.ts`:

```ts
import { readFileSync } from 'node:fs'
import { validateGameData } from '../src/data/validate'
import { simulate } from '../src/tools/reachability'
import type { GameData } from '../src/types'

const game = JSON.parse(readFileSync('public/game.json', 'utf8')) as GameData

const schemaErrors = validateGameData(game)
if (schemaErrors.length > 0) {
  console.error('SCHEMA ERRORS:')
  for (const e of schemaErrors) console.error('  -', e)
  process.exit(1)
}

const r = simulate(game)
console.log(`rooms reached:      ${r.reachedRooms.length}/${game.rooms.length}`)
console.log(`hotspots reachable: ${r.examinedHotspots.length}`)
console.log(`fractures:          ${r.fractures.length}/${game.fractureIds.length}`)
console.log(`ending A reachable: ${r.endingAReachable}`)
console.log(`ending B reachable: ${r.endingBReachable}`)
if (r.errors.length > 0) {
  console.error('REACHABILITY ERRORS:')
  for (const e of r.errors) console.error('  -', e)
  process.exit(1)
}
console.log('OK — game is completable.')
```

- [ ] **Step 4: Run tests + CLI to verify**

Run: `npx vitest run tests/reachability.test.ts` — Expected: 4 passed.
Run: `npm run validate` — Expected output ends with `OK — game is completable.`

- [ ] **Step 5: Commit**

```bash
git add src/tools/reachability.ts tools/validate.ts tests/reachability.test.ts
git commit -m "feat(tools): headless reachability validator proving endings and fractures"
```

---

### Task 18: Finale — Doubt Prompt, misaligned word, Endings A and B

**Files:**
- Create: `src/engine/finale.ts`
- Modify: `src/style.css` (append finale styles)
- Test: `tests/finale.test.ts`

**Interfaces:**
- Consumes: `Store`, `TextBox` (uses its public `.el` for rich rendering), `Stage`, `GameData`, `AudioManager` (optional).
- Produces: `Finale` class — `constructor(deps: { store: Store; textBox: TextBox; stage: Stage; game: GameData; audio?: AudioManager })`, `start(): Promise<void>`. Behavior:
  - Plays `finale.beats` one text box at a time; click anywhere on the stage advances.
  - On the accuse beat, **only if** `store.fractureCount() >= finale.minFractures`, the `accuseWord` renders as `<span class="accuse">` — visually *slightly wrong* (subtle transform), never announced. Clicking it is the accusation → Ending B. Clicking anywhere else advances normally.
  - Fewer than `minFractures`, or accusation never clicked → Ending A after the last beat.
  - **Ending A:** `endingA` lines, then a credits overlay (`.ending-a`) where the Polaroid (`photos/polaroid-photo.svg`) slowly develops via CSS animation.
  - **Ending B:** hard silence (`audio.enterSilence()`), then each `[mara, objective]` pair renders as interleaved word-spans overwriting each other (`.corrupt-line`), then a single final hotspot appears — the hallway mirror (`.mirror-hotspot`), Look Again only — whose click shows `endingB.mirrorLookAgain` as objective text over black (`.ending-b`).

- [ ] **Step 1: Write the failing tests**

`tests/finale.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Finale } from '../src/engine/finale'
import { TextBox } from '../src/engine/textbox'
import { Stage } from '../src/engine/stage'
import { Store, makeInitialState } from '../src/state/store'
import { makeTinyGame } from './fixtures'

const setup = (fractureCount: number) => {
  const game = makeTinyGame() // finale.minFractures = 1, accuseWord 'certain' in beat 0
  const store = new Store(makeInitialState('living'))
  for (let i = 0; i < fractureCount; i++) store.registerFracture(`f${i + 1}`)
  const stageEl = document.createElement('div')
  document.body.append(stageEl)
  const textBox = new TextBox(stageEl, { charsPerSecond: 100000 })
  const stage = new Stage(stageEl)
  const finale = new Finale({ store, textBox, stage, game })
  return { stageEl, finale, textBox }
}

const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('Finale', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); document.body.replaceChildren() })

  it('below threshold: no accuse span, ends in Ending A with the polaroid', async () => {
    const { stageEl, finale } = setup(0)
    const done = finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(stageEl.querySelector('.accuse')).toBeNull()
    click(stageEl) // advance past the single beat
    await vi.advanceTimersByTimeAsync(3000)
    click(stageEl) // advance past ending A lines
    await vi.advanceTimersByTimeAsync(3000)
    expect(stageEl.querySelector('.ending-a img')?.getAttribute('src')).toContain('polaroid-photo')
    await done
  })

  it('at threshold: the accuse word is rendered as a clickable span', async () => {
    const { stageEl, finale } = setup(1)
    void finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    const span = stageEl.querySelector('.accuse')
    expect(span?.textContent).toBe('certain')
  })

  it('clicking the accuse word triggers Ending B: corruption then the mirror', async () => {
    const { stageEl, finale } = setup(1)
    void finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    click(stageEl.querySelector('.accuse')!)
    await vi.advanceTimersByTimeAsync(10000)
    expect(stageEl.querySelectorAll('.corrupt-line').length).toBeGreaterThan(0)
    const mirror = stageEl.querySelector('.mirror-hotspot')!
    click(mirror)
    await vi.advanceTimersByTimeAsync(1000)
    expect(stageEl.querySelector('.ending-b')!.textContent).toContain('You look again')
  })

  it('advancing without accusing at threshold still gives Ending A', async () => {
    const { stageEl, finale } = setup(1)
    const done = finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    click(stageEl) // advance the beat WITHOUT clicking the word
    await vi.advanceTimersByTimeAsync(3000)
    click(stageEl)
    await vi.advanceTimersByTimeAsync(3000)
    expect(stageEl.querySelector('.ending-a')).toBeTruthy()
    await done
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/finale.test.ts`
Expected: FAIL — cannot resolve `../src/engine/finale`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
/* The misaligned word. Wrong enough to catch a suspicious eye, never flagged. */
.accuse {
  display: inline-block;
  transform: translateY(1.5px) rotate(0.6deg);
  letter-spacing: 0.5px;
  cursor: pointer;
}
.corrupt-line { display: block; }
.corrupt-line .m { font-style: italic; color: #e8e2d6; }
.corrupt-line .o { font-style: normal; font-family: 'Courier New', monospace; color: #cfd4d6; }
.ending-a, .ending-b {
  position: absolute; inset: 0; z-index: 40; background: #000;
  display: grid; place-items: center; color: #cfd4d6; text-align: center;
  font-size: 20px; padding: 60px; box-sizing: border-box;
}
.ending-a img { width: 320px; animation: develop 8s ease forwards; }
@keyframes develop {
  from { filter: brightness(4) blur(12px); opacity: 0.2; }
  to { filter: brightness(1) blur(0); opacity: 1; }
}
.mirror-hotspot {
  position: absolute; left: 540px; top: 160px; width: 200px; height: 320px;
  z-index: 35; cursor: pointer; background: transparent;
}
```

`src/engine/finale.ts`:

```ts
import type { GameData } from '../types'
import type { Store } from '../state/store'
import type { TextBox } from './textbox'
import type { Stage } from './stage'
import type { AudioManager } from './audio'

export class Finale {
  private accused = false
  private stageEl: HTMLElement

  constructor(private deps: {
    store: Store
    textBox: TextBox
    stage: Stage
    game: GameData
    audio?: AudioManager
  }) {
    this.stageEl = deps.textBox.el.parentElement ?? document.body
  }

  async start(): Promise<void> {
    const { beats, accuseBeatIndex, accuseWord, minFractures } = this.deps.game.finale
    const canAccuse = this.deps.store.fractureCount() >= minFractures
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]!
      if (i === accuseBeatIndex && canAccuse) this.renderAccusableBeat(beat, accuseWord)
      else await this.deps.textBox.showNarration(`finale:${i}`, beat)
      await this.waitForAdvance()
      if (this.accused) return this.endingB()
    }
    await this.endingA()
  }

  /** The beat renders instantly with the accuse word subtly misaligned. */
  private renderAccusableBeat(beat: string, word: string): void {
    const el = this.deps.textBox.el
    this.deps.textBox.showObjective('finale:accuse', '') // claims the box, then we enrich it
    el.className = 'textband mara'
    el.replaceChildren()
    const idx = beat.indexOf(word)
    el.append(document.createTextNode(beat.slice(0, idx)))
    const span = document.createElement('span')
    span.className = 'accuse'
    span.textContent = word
    span.addEventListener('click', e => {
      e.stopPropagation()
      this.accused = true
      this.advance?.()
    })
    el.append(span)
    el.append(document.createTextNode(beat.slice(idx + word.length)))
  }

  private advance: (() => void) | null = null
  private waitForAdvance(): Promise<void> {
    return new Promise(resolve => {
      this.advance = () => { this.advance = null; resolve() }
      this.stageEl.addEventListener('click', () => this.advance?.(), { once: true })
    })
  }

  private async endingA(): Promise<void> {
    for (const line of this.deps.game.finale.endingA) {
      await this.deps.textBox.showNarration('finale:endingA', line)
      await this.waitForAdvance()
    }
    const credits = document.createElement('div')
    credits.className = 'ending-a'
    const img = document.createElement('img')
    img.src = 'photos/polaroid-photo.svg'
    img.alt = ''
    credits.append(img)
    this.stageEl.append(credits)
  }

  private async endingB(): Promise<void> {
    this.deps.audio?.enterSilence()
    const el = this.deps.textBox.el
    this.deps.textBox.clear()
    el.className = 'textband'
    for (const [mara, objective] of this.deps.game.finale.endingB.corrupt) {
      const line = document.createElement('span')
      line.className = 'corrupt-line'
      const mWords = mara.split(' ')
      const oWords = objective.split(' ')
      const n = Math.max(mWords.length, oWords.length)
      for (let i = 0; i < n; i++) {
        if (mWords[i]) line.append(this.word('m', mWords[i]!))
        if (oWords[i]) line.append(this.word('o', oWords[i]!))
      }
      el.append(line)
      await new Promise(r => setTimeout(r, 900))
    }
    const mirror = document.createElement('div')
    mirror.className = 'mirror-hotspot'
    mirror.addEventListener('click', e => {
      e.stopPropagation()
      const black = document.createElement('div')
      black.className = 'ending-b'
      black.textContent = this.deps.game.finale.endingB.mirrorLookAgain
      this.stageEl.append(black)
    })
    this.stageEl.append(mirror)
  }

  private word(cls: string, text: string): HTMLElement {
    const s = document.createElement('span')
    s.className = cls
    s.textContent = text + ' '
    return s
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/finale.test.ts`
Expected: 4 passed. Then run the full suite (`npx vitest run`) and play the bedroom sequence in `npm run dev` end to end — both endings.

- [ ] **Step 5: Commit**

```bash
git add src/engine/finale.ts src/style.css tests/finale.test.ts
git commit -m "feat(engine): doubt prompt with misaligned accuse word and both endings"
```

---

### Task 19: Pause menu + accessibility settings

**Files:**
- Create: `src/ui/menu.ts`
- Modify: `src/main.ts` (replace the raw Space listeners with the menu), `src/style.css`
- Test: `tests/menu.test.ts`

**Interfaces:**
- Consumes: `AudioManager.setVolume`, `TextBox.setSpeed`, `HotspotLayer.setBreathe`.
- Produces: `PauseMenu` class — `constructor(stageEl: HTMLElement, deps: { audio: AudioManager; textBox: TextBox; hotspots: HotspotLayer })`. Esc toggles the overlay. Controls: master volume (0–1), text speed (20–80 cps), breathe-mode toggle (when enabled, *holding* Space dims to hotspots), content notes. Settings persist to `localStorage['wtlt-settings']` as `{ volume: number; textSpeed: number; breatheEnabled: boolean }`, applied on construction.

- [ ] **Step 1: Write the failing tests**

`tests/menu.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PauseMenu } from '../src/ui/menu'
import { AudioManager } from '../src/engine/audio'
import { TextBox } from '../src/engine/textbox'
import { HotspotLayer } from '../src/engine/hotspots'

const setup = () => {
  const stageEl = document.createElement('div')
  document.body.append(stageEl)
  const audio = new AudioManager(() => ({ createGain: () => ({ gain: { value: 1 }, connect: () => {} }), destination: {} } as any))
  audio.init()
  const textBox = new TextBox(stageEl)
  const hotspots = new HotspotLayer(stageEl, { onHotspot: () => {}, onExit: () => {} })
  const setBreathe = vi.spyOn(hotspots, 'setBreathe')
  const menu = new PauseMenu(stageEl, { audio, textBox, hotspots })
  return { stageEl, audio, menu, setBreathe }
}

const key = (type: string, code: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { code }))

describe('PauseMenu', () => {
  beforeEach(() => { localStorage.clear(); document.body.replaceChildren() })

  it('toggles with Escape', () => {
    const { stageEl } = setup()
    const overlay = stageEl.querySelector('.pause-menu')!
    expect(overlay.classList.contains('hidden')).toBe(true)
    key('keydown', 'Escape')
    expect(overlay.classList.contains('hidden')).toBe(false)
    key('keydown', 'Escape')
    expect(overlay.classList.contains('hidden')).toBe(true)
  })

  it('volume slider drives the audio manager and persists', () => {
    const { stageEl, audio } = setup()
    const slider = stageEl.querySelector<HTMLInputElement>('input[name="volume"]')!
    slider.value = '0.5'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(audio.state().volume).toBe(0.5)
    expect(JSON.parse(localStorage.getItem('wtlt-settings')!).volume).toBe(0.5)
  })

  it('Space engages breathe mode only when the toggle is enabled', () => {
    const { stageEl, setBreathe } = setup()
    key('keydown', 'Space')
    expect(setBreathe).not.toHaveBeenCalled()
    const toggle = stageEl.querySelector<HTMLInputElement>('input[name="breathe"]')!
    toggle.checked = true
    toggle.dispatchEvent(new Event('change', { bubbles: true }))
    key('keydown', 'Space')
    expect(setBreathe).toHaveBeenCalledWith(true)
    key('keyup', 'Space')
    expect(setBreathe).toHaveBeenCalledWith(false)
  })

  it('restores persisted settings on construction', () => {
    localStorage.setItem('wtlt-settings', JSON.stringify({ volume: 0.3, textSpeed: 60, breatheEnabled: true }))
    const { audio } = setup()
    expect(audio.state().volume).toBe(0.3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/menu.test.ts`
Expected: FAIL — cannot resolve `../src/ui/menu`.

- [ ] **Step 3: Implement**

Append to `src/style.css`:

```css
.pause-menu {
  position: absolute; inset: 0; z-index: 50;
  background: rgba(0, 0, 0, 0.85); color: #e8e2d6;
  display: grid; place-items: center;
}
.pause-menu.hidden { display: none; }
.pause-menu .panel { width: 480px; display: grid; gap: 16px; font-size: 18px; }
.pause-menu label { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.pause-menu .notes { font-size: 14px; color: #a89f92; line-height: 1.5; }
```

`src/ui/menu.ts`:

```ts
import type { AudioManager } from '../engine/audio'
import type { TextBox } from '../engine/textbox'
import type { HotspotLayer } from '../engine/hotspots'

interface Settings { volume: number; textSpeed: number; breatheEnabled: boolean }
const KEY = 'wtlt-settings'
const DEFAULTS: Settings = { volume: 1, textSpeed: 40, breatheEnabled: false }

export class PauseMenu {
  private el: HTMLElement
  private settings: Settings

  constructor(
    stageEl: HTMLElement,
    private deps: { audio: AudioManager; textBox: TextBox; hotspots: HotspotLayer },
  ) {
    this.settings = this.loadSettings()
    this.el = document.createElement('div')
    this.el.className = 'pause-menu hidden'
    this.el.innerHTML = `
      <div class="panel">
        <h2>Paused</h2>
        <label>Volume <input type="range" name="volume" min="0" max="1" step="0.05"></label>
        <label>Text speed <input type="range" name="textSpeed" min="20" max="80" step="5"></label>
        <label>Breathe mode (hold Space to steady yourself)
          <input type="checkbox" name="breathe"></label>
        <p class="notes">Content notes: themes of death, grief, and psychological
          unease. No jump scares. ~30 minutes. Progress saves automatically.</p>
      </div>`
    stageEl.append(this.el)

    const volume = this.el.querySelector<HTMLInputElement>('input[name="volume"]')!
    const speed = this.el.querySelector<HTMLInputElement>('input[name="textSpeed"]')!
    const breathe = this.el.querySelector<HTMLInputElement>('input[name="breathe"]')!
    volume.value = String(this.settings.volume)
    speed.value = String(this.settings.textSpeed)
    breathe.checked = this.settings.breatheEnabled
    this.apply()

    volume.addEventListener('input', () => this.update({ volume: Number(volume.value) }))
    speed.addEventListener('input', () => this.update({ textSpeed: Number(speed.value) }))
    breathe.addEventListener('change', () => this.update({ breatheEnabled: breathe.checked }))

    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') this.el.classList.toggle('hidden')
      if (e.code === 'Space' && this.settings.breatheEnabled) this.deps.hotspots.setBreathe(true)
    })
    window.addEventListener('keyup', e => {
      if (e.code === 'Space' && this.settings.breatheEnabled) this.deps.hotspots.setBreathe(false)
    })
  }

  private loadSettings(): Settings {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      return { ...DEFAULTS }
    }
  }

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    localStorage.setItem(KEY, JSON.stringify(this.settings))
    this.apply()
  }

  private apply(): void {
    this.deps.audio.setVolume(this.settings.volume)
    this.deps.textBox.setSpeed(this.settings.textSpeed)
  }
}
```

In `src/main.ts`, delete the two raw Space listeners added in Task 16:

```ts
window.addEventListener('keydown', e => { if (e.code === 'Space') hotspots.setBreathe(true) })
window.addEventListener('keyup', e => { if (e.code === 'Space') hotspots.setBreathe(false) })
```

and replace with:

```ts
import { PauseMenu } from './ui/menu'   // add to imports at top
// ...
new PauseMenu(stageEl, { audio, textBox, hotspots })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/menu.test.ts`
Expected: 4 passed. Run the full suite: `npx vitest run` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/menu.ts src/main.ts src/style.css tests/menu.test.ts
git commit -m "feat(ui): pause menu with volume, text speed, and breathe accessibility toggle"
```

---

### Task 20: Build, size check, release zip

**Files:**
- Modify: `package.json` (release script)

- [ ] **Step 1: Add the release script**

In `package.json` scripts, add:

```json
"release": "npm run check && npm run build && cd dist && zip -r ../release.zip . && cd .. && du -sh release.zip"
```

- [ ] **Step 2: Run the full gate**

Run: `npm run check`
Expected: typecheck clean, all vitest suites pass, `npm run validate` prints `OK — game is completable.`

Run: `npm run build`
Expected: vite build succeeds. `du -sh dist` well under 15 MB (placeholder SVGs are tiny; the budget is for the eventual photos).

- [ ] **Step 3: Smoke-test the production build**

Run: `npm run preview`, play entry → living room, confirm plates, hotspots, text band, and autosave (reload restores the room).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(release): add check-gated release zip script"
```

---

## Out of Scope for This Plan (production checklist)

These are content/production passes from the spec that happen *after* the engine is proven, and touch only `public/` assets and `game.json` prose — no code:

1. **Photography session** (spec §6): shoot all 5 rooms tripod-locked in one session, ~25 plates including variant plates (`living-shift3`, `bathroom-shift5`, `bedroom-shift7`, drawer/door states, the polaroid stinger with two shadows). Export to `public/photos/` **using the exact placeholder filenames**, then re-trace every hotspot/exit `polygon` in `game.json` over the real photos. Re-run `npm run validate` + full suite afterward.
2. **Writing pass** (spec §9): human authors the contradiction ledger as canon (the 7-row table in Task 16 is the seed), drafts Mara's voice for 3–4 hotspots, then drafts the remaining ~50 narration pairs to the ledger. Replace every `[PLACEHOLDER…]` string in `game.json`. The `mirrorLookAgain` line is flagged in-data as requiring the writing pass.
3. **Real audio** (spec §7): 5 room-tone loops, piano/tape-hiss motif + 3 detuned variants, ~8 stingers, swapped in behind the existing `AudioManager` API.
4. **Screen-reader pass on the accusation mechanic** (spec §12): blocking before final build, not before development. The `.accuse` span needs an equivalent non-visual affordance; decide with an accessibility review.
5. **Playtesting** (spec §10): the key exit question — *at what point did you first suspect the narrator?* Target: living room (attentive) to bathroom (everyone). Tune lie loudness in `game.json`, fracture threshold (7 vs 5) via `fractureShifts`/`minFractures`.
