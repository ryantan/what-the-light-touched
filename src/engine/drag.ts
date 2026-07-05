import type { Point } from '../types'
import { pointInPolygon } from './geometry'
import { STAGE_W } from '../app'

export class NotebookDrag {
  private el: HTMLElement | null = null
  private dragging = false
  private revealed = false

  constructor(private opts: {
    stageEl: HTMLElement
    glowPolygon: Point[]
    onRevealed: () => void
  }) {}

  show(at: Point): void {
    if (this.el) return
    const el = document.createElement('div')
    el.className = 'notebook'
    el.textContent = 'water-damaged notebook'
    this.place(el, at)
    el.addEventListener('pointerdown', () => {
      this.dragging = true
      el.classList.add('dragging')
    })
    const stage = this.opts.stageEl
    stage.addEventListener('pointermove', this.onMove)
    stage.addEventListener('pointerup', this.onUp)
    stage.append(el)
    this.el = el
  }

  hide(): void {
    this.el?.remove()
    this.el = null
    this.opts.stageEl.removeEventListener('pointermove', this.onMove)
    this.opts.stageEl.removeEventListener('pointerup', this.onUp)
  }

  private toStage(e: MouseEvent): Point {
    const rect = this.opts.stageEl.getBoundingClientRect()
    const scale = rect.width / STAGE_W
    return [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale]
  }

  private place(el: HTMLElement, [x, y]: Point): void {
    el.style.left = `${x - 60}px`
    el.style.top = `${y - 45}px`
  }

  private onMove = (e: MouseEvent): void => {
    if (!this.dragging || !this.el) return
    this.place(this.el, this.toStage(e))
  }

  private onUp = (e: MouseEvent): void => {
    if (!this.dragging || !this.el) return
    this.dragging = false
    this.el.classList.remove('dragging')
    if (!this.revealed && pointInPolygon(this.toStage(e), this.opts.glowPolygon)) {
      this.revealed = true
      this.opts.onRevealed()
    }
  }
}
