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
