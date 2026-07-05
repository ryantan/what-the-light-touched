import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Stage, CROSSFADE_MS } from '../src/engine/stage'

describe('Stage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const make = () => {
    const el = document.createElement('div')
    return { el, stage: new Stage(el) }
  }

  it('creates two stacked image layers', () => {
    const { el } = make()
    expect(el.querySelectorAll('img.plate').length).toBe(2)
  })

  it('crossfades to a new plate over 400ms', async () => {
    const { el, stage } = make()
    const p = stage.showPlate('photos/a.svg')
    const imgs = [...el.querySelectorAll<HTMLImageElement>('img.plate')]
    const incoming = imgs.find(i => i.src.includes('a.svg'))!
    expect(incoming.classList.contains('visible')).toBe(true)
    let done = false
    p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(CROSSFADE_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
    expect(stage.currentSrc()).toContain('a.svg')
  })

  it('is a no-op when showing the current plate again', async () => {
    const { stage } = make()
    const first = stage.showPlate('photos/a.svg')
    await vi.advanceTimersByTimeAsync(CROSSFADE_MS)
    await first
    const p = stage.showPlate('photos/a.svg')
    let done = false
    p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
  })

  it('same-src call during an in-flight fade resolves when that fade completes', async () => {
    const { stage } = make()
    void stage.showPlate('photos/a.svg')
    const second = stage.showPlate('photos/a.svg') // mid-fade, same src
    let done = false
    second.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(CROSSFADE_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })
})
