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
