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
