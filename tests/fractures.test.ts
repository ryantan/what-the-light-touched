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

  it('registers regardless of examine/look-again order', () => {
    const { store, fs } = setup()
    const h = hotspot('mirror', 'f1')
    fs.noteLookAgain(h)
    expect(store.fractureCount()).toBe(0) // only one half seen
    fs.noteExamine(h)
    expect(store.fractureCount()).toBe(1)
  })

  it('setContext re-checks shifts crossed before context arrived', () => {
    const store = new Store(makeInitialState('entry'))
    const fs = new FractureSystem(store, [{ at: 1, effects: [{ kind: 'setPlate', room: 'living', plate: 'shifted' }] }] as any)
    fs.register('f1') // ctx not set yet
    const setPlate = vi.fn()
    const ctx: EffectContext = {
      store, goToRoom: vi.fn(), setPlate, playSting: vi.fn(),
      registerFracture: (id: string) => fs.register(id), startFinale: vi.fn(),
    }
    fs.setContext(ctx)
    expect(setPlate).toHaveBeenCalledWith('living', 'shifted')
  })
})
