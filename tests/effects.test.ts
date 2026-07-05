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
