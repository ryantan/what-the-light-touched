import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PauseMenu } from '../src/ui/menu'
import { AudioManager } from '../src/engine/audio'
import { TextBox } from '../src/engine/textbox'
import { HotspotLayer } from '../src/engine/hotspots'

const setup = () => {
  const stageEl = document.createElement('div')
  document.body.append(stageEl)
  const audio = new AudioManager(() => ({ createGain: () => ({ gain: { value: 1 }, connect: () => {} }), destination: {} } as any))
  audio.init()
  const textBox = new TextBox(stageEl)
  const hotspots = new HotspotLayer(stageEl, { onHotspot: () => {}, onExit: () => {} })
  const setBreathe = vi.spyOn(hotspots, 'setBreathe')
  const menu = new PauseMenu(stageEl, { audio, textBox, hotspots })
  return { stageEl, audio, menu, setBreathe }
}

const key = (type: string, code: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { code }))

describe('PauseMenu', () => {
  beforeEach(() => { localStorage.clear(); document.body.replaceChildren() })

  it('toggles with Escape', () => {
    const { stageEl } = setup()
    const overlay = stageEl.querySelector('.pause-menu')!
    expect(overlay.classList.contains('hidden')).toBe(true)
    key('keydown', 'Escape')
    expect(overlay.classList.contains('hidden')).toBe(false)
    key('keydown', 'Escape')
    expect(overlay.classList.contains('hidden')).toBe(true)
  })

  it('volume slider drives the audio manager and persists', () => {
    const { stageEl, audio } = setup()
    const slider = stageEl.querySelector<HTMLInputElement>('input[name="volume"]')!
    slider.value = '0.5'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(audio.state().volume).toBe(0.5)
    expect(JSON.parse(localStorage.getItem('wtlt-settings')!).volume).toBe(0.5)
  })

  it('Space engages breathe mode only when the toggle is enabled', () => {
    const { stageEl, setBreathe } = setup()
    key('keydown', 'Space')
    expect(setBreathe).not.toHaveBeenCalled()
    const toggle = stageEl.querySelector<HTMLInputElement>('input[name="breathe"]')!
    toggle.checked = true
    toggle.dispatchEvent(new Event('change', { bubbles: true }))
    key('keydown', 'Space')
    expect(setBreathe).toHaveBeenCalledWith(true)
    key('keyup', 'Space')
    expect(setBreathe).toHaveBeenCalledWith(false)
  })

  it('restores persisted settings on construction', () => {
    localStorage.setItem('wtlt-settings', JSON.stringify({ volume: 0.3, textSpeed: 60, breatheEnabled: true }))
    const { audio } = setup()
    expect(audio.state().volume).toBe(0.3)
  })
})
