import { describe, it, expect } from 'vitest'
import { createStage } from '../src/app'

describe('createStage', () => {
  it('mounts a 1280x720 stage inside a centering frame', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const stage = createStage(root)
    expect(stage.id).toBe('stage')
    expect(stage.style.width).toBe('1280px')
    expect(stage.style.height).toBe('720px')
    expect(root.querySelector('#frame')?.contains(stage)).toBe(true)
  })

  it('scales the stage to fit the window', () => {
    const root = document.createElement('div')
    const stage = createStage(root)
    // happy-dom default window is 1024x768 → scale = 1024/1280 = 0.8
    expect(stage.style.transform).toContain('scale(0.8')
  })
})
