import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Finale } from '../src/engine/finale'
import { TextBox } from '../src/engine/textbox'
import { Stage } from '../src/engine/stage'
import { Store, makeInitialState } from '../src/state/store'
import { makeTinyGame } from './fixtures'

const setup = (fractureCount: number) => {
  const game = makeTinyGame() // finale.minFractures = 1, accuseWord 'certain' in beat 0
  const store = new Store(makeInitialState('living'))
  for (let i = 0; i < fractureCount; i++) store.registerFracture(`f${i + 1}`)
  const stageEl = document.createElement('div')
  document.body.append(stageEl)
  const textBox = new TextBox(stageEl, { charsPerSecond: 100000 })
  const stage = new Stage(stageEl)
  const finale = new Finale({ store, textBox, stage, game })
  return { stageEl, finale, textBox }
}

const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('Finale', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); document.body.replaceChildren() })

  it('below threshold: no accuse span, ends in Ending A with the polaroid', async () => {
    const { stageEl, finale } = setup(0)
    const done = finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(stageEl.querySelector('.accuse')).toBeNull()
    click(stageEl) // advance past the single beat
    await vi.advanceTimersByTimeAsync(3000)
    click(stageEl) // advance past ending A lines
    await vi.advanceTimersByTimeAsync(3000)
    expect(stageEl.querySelector('.ending-a img')?.getAttribute('src')).toContain('polaroid-photo')
    await done
  })

  it('at threshold: the accuse word is rendered as a clickable span', async () => {
    const { stageEl, finale } = setup(1)
    void finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    const span = stageEl.querySelector('.accuse')
    expect(span?.textContent).toBe('certain')
  })

  it('clicking the accuse word triggers Ending B: corruption then the mirror', async () => {
    const { stageEl, finale } = setup(1)
    void finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    click(stageEl.querySelector('.accuse')!)
    await vi.advanceTimersByTimeAsync(10000)
    expect(stageEl.querySelectorAll('.corrupt-line').length).toBeGreaterThan(0)
    const mirror = stageEl.querySelector('.mirror-hotspot')!
    click(mirror)
    await vi.advanceTimersByTimeAsync(1000)
    expect(stageEl.querySelector('.ending-b')!.textContent).toContain('You look again')
  })

  it('advancing without accusing at threshold still gives Ending A', async () => {
    const { stageEl, finale } = setup(1)
    const done = finale.start()
    await vi.advanceTimersByTimeAsync(1000)
    click(stageEl) // advance the beat WITHOUT clicking the word
    await vi.advanceTimersByTimeAsync(3000)
    click(stageEl)
    await vi.advanceTimersByTimeAsync(3000)
    expect(stageEl.querySelector('.ending-a')).toBeTruthy()
    await done
  })
})
