import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InteractionController } from '../src/engine/interactions'
import { TextBox } from '../src/engine/textbox'
import { FractureSystem } from '../src/engine/fractures'
import { Store, makeInitialState } from '../src/state/store'
import type { EffectContext } from '../src/engine/effects'
import type { Hotspot } from '../src/types'

const chair: Hotspot = {
  id: 'chair',
  polygon: [[0, 0], [1, 0], [1, 1]],
  examine: 'MARA: Her reading chair. She was at peace.',
  examineTiered: [{ tier: 1, text: 'MARA: Why do you keep staring at the chair?' }],
  lookAgain: 'A chair facing the wall.',
  fractureId: 'f1',
  onExamine: [{ kind: 'setFlag', name: 'sawChair' }],
}
const lamp: Hotspot = {
  id: 'lamp', polygon: [[0, 0], [1, 0], [1, 1]],
  examine: 'MARA: Her lamp.', lookAgain: 'A lamp.',
}
const stingy: Hotspot = {
  id: 'stingy', polygon: [[0, 0], [1, 0], [1, 1]],
  examine: 'MARA: A ticking clock.', lookAgain: 'The clock has stopped.',
  onExamine: [{ kind: 'sting', id: 'clock-examine' }],
  onLookAgain: [{ kind: 'sting', id: 'clock-look-again' }],
}

const setup = () => {
  const store = new Store(makeInitialState('living'))
  const el = document.createElement('div')
  const textBox = new TextBox(el, { charsPerSecond: 1000 })
  const fractures = new FractureSystem(store, [])
  const playSting = vi.fn()
  const ctx: EffectContext = {
    store,
    goToRoom: vi.fn(), setPlate: vi.fn(), playSting,
    registerFracture: id => fractures.register(id),
    startFinale: vi.fn(),
  }
  fractures.setContext(ctx)
  const onExamineShown = vi.fn()
  const onLookAgainShown = vi.fn()
  const controller = new InteractionController({
    textBox, fractures, ctx,
    hooks: { onExamineShown, onLookAgainShown },
  })
  return { store, el, textBox, controller, onExamineShown, onLookAgainShown, playSting }
}

describe('InteractionController', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('first click examines: mara voice, effects run, hook fires', () => {
    const { store, el, controller, onExamineShown } = setup()
    controller.handleHotspotClick(chair)
    expect(el.querySelector('.textband')!.classList.contains('mara')).toBe(true)
    expect(store.getFlag('sawChair')).toBe(true)
    expect(store.getFlag('seenExamine:chair')).toBe(true)
    expect(onExamineShown).toHaveBeenCalledWith(chair)
  })

  it('second click on the same hotspot shows Look Again and registers the fracture', () => {
    const { store, el, controller, onLookAgainShown } = setup()
    controller.handleHotspotClick(chair)
    controller.handleHotspotClick(chair)
    const band = el.querySelector('.textband')!
    expect(band.classList.contains('objective')).toBe(true)
    expect(band.textContent).toBe('A chair facing the wall.')
    expect(store.fractureCount()).toBe(1)
    expect(onLookAgainShown).toHaveBeenCalledWith(chair)
  })

  it('clicking a different hotspot examines it instead', () => {
    const { store, controller } = setup()
    controller.handleHotspotClick(chair)
    controller.handleHotspotClick(lamp)
    expect(store.getFlag('seenExamine:lamp')).toBe(true)
    expect(store.fractureCount()).toBe(0)
  })

  it('after clear, the same hotspot examines again (no accidental Look Again)', () => {
    const { store, textBox, controller } = setup()
    controller.handleHotspotClick(chair)
    textBox.clear()
    controller.handleHotspotClick(chair)
    expect(store.getFlag('seenLookAgain:chair')).toBe(false)
  })

  it('uses tiered examine text once the fracture tier is high enough', () => {
    const { store, el, controller } = setup()
    ;['fa', 'fb', 'fc'].forEach(id => store.registerFracture(id)) // tier 1
    controller.handleHotspotClick(chair)
    vi.advanceTimersByTime(5000)
    expect(el.querySelector('.textband')!.textContent).toContain('Why do you keep staring')
  })

  it('on examine, the audio hook fires before any sting effect', () => {
    const { controller, onExamineShown, playSting } = setup()
    controller.handleHotspotClick(stingy)
    expect(onExamineShown).toHaveBeenCalledWith(stingy)
    expect(playSting).toHaveBeenCalledWith('clock-examine')
    expect(onExamineShown.mock.invocationCallOrder[0]!).toBeLessThan(playSting.mock.invocationCallOrder[0]!)
  })

  it('on look again, the audio hook fires before fracture notes and any sting effect', () => {
    const { controller, onLookAgainShown, playSting } = setup()
    controller.handleHotspotClick(stingy)
    controller.handleHotspotClick(stingy)
    expect(onLookAgainShown).toHaveBeenCalledWith(stingy)
    expect(playSting).toHaveBeenCalledWith('clock-look-again')
    expect(onLookAgainShown.mock.invocationCallOrder[0]!).toBeLessThan(playSting.mock.invocationCallOrder[1]!)
  })
})
