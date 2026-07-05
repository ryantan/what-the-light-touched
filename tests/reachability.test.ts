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

  it('is independent of hotspot array order relative to the finale trigger', () => {
    const g = makeTinyGame()
    // a second fracture hotspot AFTER the finale-triggering chair in the same room
    g.fractureIds.push('f2')
    g.rooms[1]!.hotspots.push({
      id: 'late-secret',
      polygon: [[700, 300], [800, 300], [800, 400]],
      examine: 'MARA: Nothing there.',
      lookAgain: 'Something is there.',
      fractureId: 'f2',
    })
    g.finale.minFractures = 2
    const r = simulate(g)
    expect(r.errors).toEqual([])
    expect(r.endingBReachable).toBe(true)
    expect(r.fractures.sort()).toEqual(['f1', 'f2'])
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
