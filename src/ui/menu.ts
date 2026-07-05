import type { AudioManager } from '../engine/audio'
import type { TextBox } from '../engine/textbox'
import type { HotspotLayer } from '../engine/hotspots'

interface Settings { volume: number; textSpeed: number; breatheEnabled: boolean }
const KEY = 'wtlt-settings'
const DEFAULTS: Settings = { volume: 1, textSpeed: 40, breatheEnabled: false }

export class PauseMenu {
  private el: HTMLElement
  private settings: Settings

  constructor(
    stageEl: HTMLElement,
    private deps: { audio: AudioManager; textBox: TextBox; hotspots: HotspotLayer },
  ) {
    this.settings = this.loadSettings()
    this.el = document.createElement('div')
    this.el.className = 'pause-menu hidden'
    this.el.innerHTML = `
      <div class="panel">
        <h2>Paused</h2>
        <label>Volume <input type="range" name="volume" min="0" max="1" step="0.05"></label>
        <label>Text speed <input type="range" name="textSpeed" min="20" max="80" step="5"></label>
        <label>Breathe mode (hold Space to steady yourself)
          <input type="checkbox" name="breathe"></label>
        <p class="notes">Content notes: themes of death, grief, and psychological
          unease. No jump scares. ~30 minutes. Progress saves automatically.</p>
      </div>`
    stageEl.append(this.el)

    const volume = this.el.querySelector<HTMLInputElement>('input[name="volume"]')!
    const speed = this.el.querySelector<HTMLInputElement>('input[name="textSpeed"]')!
    const breathe = this.el.querySelector<HTMLInputElement>('input[name="breathe"]')!
    volume.value = String(this.settings.volume)
    speed.value = String(this.settings.textSpeed)
    breathe.checked = this.settings.breatheEnabled
    this.apply()

    volume.addEventListener('input', () => this.update({ volume: Number(volume.value) }))
    speed.addEventListener('input', () => this.update({ textSpeed: Number(speed.value) }))
    breathe.addEventListener('change', () => this.update({ breatheEnabled: breathe.checked }))

    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') this.el.classList.toggle('hidden')
      if (e.code === 'Space' && this.settings.breatheEnabled) this.deps.hotspots.setBreathe(true)
    })
    window.addEventListener('keyup', e => {
      if (e.code === 'Space' && this.settings.breatheEnabled) this.deps.hotspots.setBreathe(false)
    })
  }

  private loadSettings(): Settings {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      return { ...DEFAULTS }
    }
  }

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    localStorage.setItem(KEY, JSON.stringify(this.settings))
    this.apply()
  }

  private apply(): void {
    this.deps.audio.setVolume(this.settings.volume)
    this.deps.textBox.setSpeed(this.settings.textSpeed)
  }
}
