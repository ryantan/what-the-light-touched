import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomManager } from '../src/engine/rooms'
import { Stage } from '../src/engine/stage'
import { HotspotLayer } from '../src/engine/hotspots'
import { TextBox } from '../src/engine/textbox'
import { Store, makeInitialState } from '../src/state/store'
import { makeTinyGame } from './fixtures'

const setup = () => {
  const game = makeTinyGame()
  const store = new Store(makeInitialState(game.startRoom))
  const el = document.createElement('div')
  const stage = new Stage(el)
  const hotspots = new HotspotLayer(el, { onHotspot: vi.fn(), onExit: to => rm.handleExitClick(to) })
  const textBox = new TextBox(el, { charsPerSecond: 1000 })
  const autosave = vi.fn()
  const onRoomEntered = vi.fn()
  const rm = new RoomManager({ game, store, stage, hotspots, textBox, autosave, onRoomEntered })
  return { game, store, el, stage, rm, autosave, onRoomEntered, textBox }
}

describe('RoomManager', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('enter() shows the room plate and its hotspots', async () => {
    const { el, rm, stage, store } = setup()
    const p = rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    await p
    expect(stage.currentSrc()).toContain('entry-base.svg')
    expect(store.currentRoom()).toBe('entry')
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(2)
  })

  it('locked exits show lockedText and do not navigate', async () => {
    const { rm, el, store } = setup()
    void rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    rm.handleExitClick('living')
    await vi.advanceTimersByTimeAsync(2000)
    expect(store.currentRoom()).toBe('entry')
    expect(el.querySelector('.textband')!.textContent).toContain("Let's not rush")
  })

  it('unlocked exits navigate and autosave', async () => {
    const { rm, store, autosave, onRoomEntered } = setup()
    void rm.enter('entry')
    await vi.advanceTimersByTimeAsync(500)
    store.setFlag('sawMail') // satisfies the exit condition
    rm.handleExitClick('living')
    await vi.advanceTimersByTimeAsync(500)
    expect(store.currentRoom()).toBe('living')
    expect(autosave).toHaveBeenCalled()
    expect(onRoomEntered).toHaveBeenCalledTimes(2)
  })

  it('uses the plate override when set', async () => {
    const { rm, store, stage } = setup()
    store.setPlateOverride('living', 'shifted')
    store.setFlag('sawMail')
    void rm.enter('living')
    await vi.advanceTimersByTimeAsync(500)
    expect(stage.currentSrc()).toContain('living-shifted.svg')
  })

  it('re-evaluates hotspot visibility when the store changes', async () => {
    const { game, store, el, rm } = setup()
    game.rooms[1]!.hotspots.push({
      id: 'ghost', polygon: [[0, 0], [10, 0], [10, 10]],
      examine: 'x', lookAgain: 'y',
      visibleWhen: [{ kind: 'flag', name: 'ghostVisible' }],
    })
    store.setFlag('sawMail')
    void rm.enter('living')
    await vi.advanceTimersByTimeAsync(500)
    expect(el.querySelector('polygon[data-id="ghost"]')).toBeNull()
    store.setFlag('ghostVisible')
    expect(el.querySelector('polygon[data-id="ghost"]')).toBeTruthy()
  })
})
