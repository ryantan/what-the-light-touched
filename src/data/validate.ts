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
