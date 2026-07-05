import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TextBox } from '../src/engine/textbox'

describe('TextBox', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => {
    const el = document.createElement('div')
    return { el, box: new TextBox(el, { charsPerSecond: 10 }) } // 100ms per char
  }

  it('types narration on over time and resolves when done', async () => {
    const { el, box } = make()
    const p = box.showNarration('chair', 'abcde')
    const band = el.querySelector('.textband')!
    await vi.advanceTimersByTimeAsync(250)
    expect(band.textContent!.length).toBeGreaterThan(0)
    expect(band.textContent!.length).toBeLessThan(5)
    await vi.advanceTimersByTimeAsync(300)
    await p
    expect(band.textContent).toBe('abcde')
    expect(band.classList.contains('mara')).toBe(true)
  })

  it('shows objective text instantly and completely', () => {
    const { el, box } = make()
    box.showObjective('chair', 'A chair facing the wall.')
    const band = el.querySelector('.textband')!
    expect(band.textContent).toBe('A chair facing the wall.')
    expect(band.classList.contains('objective')).toBe(true)
  })

  it('tracks which source is showing until cleared', async () => {
    const { box } = make()
    expect(box.showingFor()).toBeNull()
    void box.showNarration('chair', 'ab')
    expect(box.showingFor()).toBe('chair')
    await vi.advanceTimersByTimeAsync(500)
    expect(box.showingFor()).toBe('chair') // stays after typing completes
    box.clear()
    expect(box.showingFor()).toBeNull()
  })

  it('skip() completes typing instantly', async () => {
    const { el, box } = make()
    const p = box.showNarration('chair', 'abcdefghij')
    await vi.advanceTimersByTimeAsync(100)
    box.skip()
    await p
    expect(el.querySelector('.textband')!.textContent).toBe('abcdefghij')
  })

  it('a new show replaces the previous source', () => {
    const { box } = make()
    void box.showNarration('chair', 'ab')
    box.showObjective('window', 'x')
    expect(box.showingFor()).toBe('window')
  })
})
