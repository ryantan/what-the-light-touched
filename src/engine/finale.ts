import type { GameData } from '../types'
import type { Store } from '../state/store'
import type { TextBox } from './textbox'
import type { Stage } from './stage'
import type { AudioManager } from './audio'

export class Finale {
  private accused = false
  private stageEl: HTMLElement

  constructor(private deps: {
    store: Store
    textBox: TextBox
    stage: Stage
    game: GameData
    audio?: AudioManager
  }) {
    this.stageEl = deps.textBox.el.parentElement ?? document.body
  }

  async start(): Promise<void> {
    const { beats, accuseBeatIndex, accuseWord, minFractures } = this.deps.game.finale
    const canAccuse = this.deps.store.fractureCount() >= minFractures
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]!
      if (i === accuseBeatIndex && canAccuse) this.renderAccusableBeat(beat, accuseWord)
      else await this.deps.textBox.showNarration(`finale:${i}`, beat)
      await this.waitForAdvance()
      if (this.accused) return this.endingB()
    }
    await this.endingA()
  }

  /** The beat renders instantly with the accuse word subtly misaligned. */
  private renderAccusableBeat(beat: string, word: string): void {
    const el = this.deps.textBox.el
    this.deps.textBox.showObjective('finale:accuse', '') // claims the box, then we enrich it
    el.className = 'textband mara'
    el.replaceChildren()
    const idx = beat.indexOf(word)
    el.append(document.createTextNode(beat.slice(0, idx)))
    const span = document.createElement('span')
    span.className = 'accuse'
    span.textContent = word
    span.addEventListener('click', e => {
      e.stopPropagation()
      this.accused = true
      this.advance?.()
    })
    el.append(span)
    el.append(document.createTextNode(beat.slice(idx + word.length)))
  }

  private advance: (() => void) | null = null
  private waitForAdvance(): Promise<void> {
    return new Promise(resolve => {
      this.advance = () => { this.advance = null; resolve() }
      this.stageEl.addEventListener('click', () => this.advance?.(), { once: true })
    })
  }

  private async endingA(): Promise<void> {
    for (const line of this.deps.game.finale.endingA) {
      await this.deps.textBox.showNarration('finale:endingA', line)
      await this.waitForAdvance()
    }
    const credits = document.createElement('div')
    credits.className = 'ending-a'
    const img = document.createElement('img')
    img.src = 'photos/polaroid-photo.svg'
    img.alt = ''
    credits.append(img)
    this.stageEl.append(credits)
  }

  private async endingB(): Promise<void> {
    this.deps.audio?.enterSilence()
    const el = this.deps.textBox.el
    this.deps.textBox.clear()
    el.className = 'textband'
    for (const [mara, objective] of this.deps.game.finale.endingB.corrupt) {
      const line = document.createElement('span')
      line.className = 'corrupt-line'
      const mWords = mara.split(' ')
      const oWords = objective.split(' ')
      const n = Math.max(mWords.length, oWords.length)
      for (let i = 0; i < n; i++) {
        if (mWords[i]) line.append(this.word('m', mWords[i]!))
        if (oWords[i]) line.append(this.word('o', oWords[i]!))
      }
      el.append(line)
      await new Promise(r => setTimeout(r, 900))
    }
    const mirror = document.createElement('div')
    mirror.className = 'mirror-hotspot'
    mirror.addEventListener('click', e => {
      e.stopPropagation()
      const black = document.createElement('div')
      black.className = 'ending-b'
      black.textContent = this.deps.game.finale.endingB.mirrorLookAgain
      this.stageEl.append(black)
    })
    this.stageEl.append(mirror)
  }

  private word(cls: string, text: string): HTMLElement {
    const s = document.createElement('span')
    s.className = cls
    s.textContent = text + ' '
    return s
  }
}
