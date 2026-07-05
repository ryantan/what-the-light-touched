export const CROSSFADE_MS = 400

export class Stage {
  private front: HTMLImageElement
  private back: HTMLImageElement
  private src: string | null = null
  private fadeDone: Promise<void> = Promise.resolve()

  constructor(stageEl: HTMLElement) {
    this.front = this.makeLayer(stageEl)
    this.back = this.makeLayer(stageEl)
  }

  private makeLayer(parent: HTMLElement): HTMLImageElement {
    const img = document.createElement('img')
    img.className = 'plate'
    img.alt = ''
    parent.append(img)
    return img
  }

  currentSrc(): string | null { return this.src }

  showPlate(src: string): Promise<void> {
    if (this.src === src) return this.fadeDone
    this.src = src
    const incoming = this.back
    const outgoing = this.front
    incoming.src = src
    incoming.classList.add('visible')
    outgoing.classList.remove('visible')
    this.back = outgoing
    this.front = incoming
    this.fadeDone = new Promise(resolve => setTimeout(resolve, CROSSFADE_MS))
    return this.fadeDone
  }
}
