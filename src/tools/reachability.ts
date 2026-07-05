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
  fracturesAtFinale: number
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

  const errors: string[] = []
  if (changed) errors.push('simulation did not reach a fixpoint within 100 passes')

  const allHotspots = game.rooms.flatMap(r => r.hotspots.map(h => h.id))
  const unreachable = allHotspots.filter(id => !examined.has(id))
  const collected = store.fractureIds()
  const missing = game.fractureIds.filter(id => !collected.includes(id))

  // startFinale gates nothing: in the real game it only hands control to the
  // finale UI, and no content unlocks because of it. That means the player is
  // always free to defer clicking the finale trigger until they are done
  // exploring, so the simulation's FIXPOINT state (not the state snapshotted
  // at the moment startFinale first fires) is exactly the best achievable
  // pre-finale state. All completability checks below are therefore computed
  // from the post-fixpoint store, which makes them independent of hotspot
  // iteration order relative to the finale trigger.
  const endingB = finaleStarted && store.fractureCount() >= game.finale.minFractures

  if (!finaleStarted) errors.push('Ending A unreachable: no path starts the finale')
  if (!endingB) errors.push(`Ending B unreachable: only ${store.fractureCount()} fractures collectible before finale (need ${game.finale.minFractures})`)
  for (const id of missing) errors.push(`fracture ${id} is not collectible before the finale`)
  for (const id of unreachable) errors.push(`hotspot ${id} is unreachable`)

  return {
    reachedRooms: [...reached],
    examinedHotspots: [...examined],
    unreachableHotspots: unreachable,
    fractures: collected,
    endingAReachable: finaleStarted,
    endingBReachable: endingB,
    fracturesAtFinale,
    errors,
  }
}
