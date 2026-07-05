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
