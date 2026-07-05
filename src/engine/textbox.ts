export class TextBox {
  readonly el: HTMLElement
  private cps: number
  private source: string | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private pending: { full: string; resolve: () => void } | null = null

  constructor(stageEl: HTMLElement, opts?: { charsPerSecond?: number }) {
    this.cps = opts?.charsPerSecond ?? 40
    this.el = document.createElement('div')
    this.el.className = 'textband'
    stageEl.append(this.el)
  }

  setSpeed(cps: number): void { this.cps = cps }
  showingFor(): string | null { return this.source }

  showNarration(sourceId: string, text: string): Promise<void> {
    this.stopTyping()
    this.source = sourceId
    this.el.className = 'textband mara'
    this.el.textContent = ''
    return new Promise(resolve => {
      this.pending = { full: text, resolve }
      let i = 0
      this.timer = setInterval(() => {
        i++
        this.el.textContent = text.slice(0, i)
        if (i >= text.length) this.finishTyping()
      }, 1000 / this.cps)
    })
  }

  showObjective(sourceId: string, text: string): void {
    this.stopTyping()
    this.source = sourceId
    this.el.className = 'textband objective'
    this.el.textContent = text
  }

  skip(): void {
    if (!this.pending) return
    this.el.textContent = this.pending.full
    this.finishTyping()
  }

  clear(): void {
    this.stopTyping()
    this.source = null
    this.el.className = 'textband'
    this.el.textContent = ''
  }

  private finishTyping(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    const p = this.pending
    this.pending = null
    p?.resolve()
  }

  private stopTyping(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    // resolve any dangling promise so callers never hang
    this.pending?.resolve()
    this.pending = null
  }
}
