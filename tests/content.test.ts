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
    // 29: the living-room `window` pair was retired when the kitchen doorway
    // replaced the window in the photo plate (exit-visibility pass).
    expect(count).toBeGreaterThanOrEqual(29)
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
