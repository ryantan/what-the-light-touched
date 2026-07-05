import { describe, it, expect, vi } from 'vitest'
import { PuzzleWatcher } from '../src/engine/puzzles'
import { Store, makeInitialState } from '../src/state/store'
import type { EffectContext } from '../src/engine/effects'
import type { PuzzleRule } from '../src/types'

const kitchenPuzzle: PuzzleRule = {
  id: 'kitchen-timeline',
  requiresFlags: ['examined:calendar', 'examined:fridge', 'examined:dishes'],
  onSolve: [
    { kind: 'registerFracture', id: 'f4' },
    { kind: 'registerFracture', id: 'f5' },
    { kind: 'setFlag', name: 'kitchenSolved' },
  ],
}

const setup = () => {
  const store = new Store(makeInitialState('kitchen'))
  const registerFracture = vi.fn()
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
    registerFracture, startFinale: vi.fn(),
  }
  const watcher = new PuzzleWatcher(store, [kitchenPuzzle], ctx)
  watcher.start()
  return { store, registerFracture }
}

describe('PuzzleWatcher', () => {
  it('solves when all required flags are set, in any order', () => {
    const { store, registerFracture } = setup()
    store.setFlag('examined:dishes')
    store.setFlag('examined:calendar')
    expect(store.getFlag('kitchenSolved')).toBe(false)
    store.setFlag('examined:fridge')
    expect(store.getFlag('kitchenSolved')).toBe(true)
    expect(registerFracture).toHaveBeenCalledWith('f4')
    expect(registerFracture).toHaveBeenCalledWith('f5')
  })

  it('solves only once', () => {
    const { store, registerFracture } = setup()
    store.setFlag('examined:calendar')
    store.setFlag('examined:fridge')
    store.setFlag('examined:dishes')
    store.setFlag('examined:calendar') // extra mutation after solve
    expect(registerFracture).toHaveBeenCalledTimes(2)
  })

  it('checks pre-existing flags on start (load-save safety)', () => {
    const store = new Store(makeInitialState('kitchen'))
    store.setFlag('examined:calendar')
    store.setFlag('examined:fridge')
    store.setFlag('examined:dishes')
    const ctx: EffectContext = {
      store, goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
      registerFracture: vi.fn(), startFinale: vi.fn(),
    }
    new PuzzleWatcher(store, [kitchenPuzzle], ctx).start()
    expect(store.getFlag('kitchenSolved')).toBe(true)
  })

  it('solves chained puzzles regardless of array order', () => {
    const store = new Store(makeInitialState('kitchen'))
    const puzzleB: PuzzleRule = {
      id: 'b', requiresFlags: ['aSolved'], onSolve: [{ kind: 'setFlag', name: 'bDone' }],
    }
    const puzzleA: PuzzleRule = {
      id: 'a', requiresFlags: ['trigger'], onSolve: [{ kind: 'setFlag', name: 'aSolved' }],
    }
    const ctx: EffectContext = {
      store, goToRoom: vi.fn(), setPlate: vi.fn(), playSting: vi.fn(),
      registerFracture: vi.fn(), startFinale: vi.fn(),
    }
    new PuzzleWatcher(store, [puzzleB, puzzleA], ctx).start() // B before A
    store.setFlag('trigger')
    expect(store.getFlag('bDone')).toBe(true)
  })
})
