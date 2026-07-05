import { describe, it, expect, vi, afterEach } from 'vitest'
import { NotebookDrag } from '../src/engine/drag'

const glow: [number, number][] = [[600, 300], [800, 300], [800, 500], [600, 500]]

const setup = () => {
  const stageEl = document.createElement('div')
  // happy-dom: give the stage a fake layout box at 1:1 scale
  stageEl.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  document.body.append(stageEl)
  const onRevealed = vi.fn()
  const drag = new NotebookDrag({ stageEl, glowPolygon: glow, onRevealed })
  return { stageEl, drag, onRevealed }
}

afterEach(() => {
  document.body.replaceChildren()
})

const pointer = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }))

describe('NotebookDrag', () => {
  it('shows and hides the notebook element', () => {
    const { stageEl, drag } = setup()
    drag.show([200, 600])
    expect(stageEl.querySelector('.notebook')).toBeTruthy()
    drag.hide()
    expect(stageEl.querySelector('.notebook')).toBeFalsy()
  })

  it('fires onRevealed when dropped inside the glow', () => {
    const { stageEl, drag, onRevealed } = setup()
    drag.show([200, 600])
    const nb = stageEl.querySelector('.notebook')!
    pointer(nb, 'pointerdown', 200, 600)
    pointer(stageEl, 'pointermove', 700, 400)
    pointer(stageEl, 'pointerup', 700, 400)
    expect(onRevealed).toHaveBeenCalledOnce()
  })

  it('does not fire when dropped outside the glow', () => {
    const { stageEl, drag, onRevealed } = setup()
    drag.show([200, 600])
    const nb = stageEl.querySelector('.notebook')!
    pointer(nb, 'pointerdown', 200, 600)
    pointer(stageEl, 'pointermove', 300, 200)
    pointer(stageEl, 'pointerup', 300, 200)
    expect(onRevealed).not.toHaveBeenCalled()
  })

  it('ends the drag when pointerup happens outside the stage', () => {
    const { stageEl, drag, onRevealed } = setup()
    drag.show([200, 600])
    const nb = stageEl.querySelector('.notebook') as HTMLElement
    pointer(nb, 'pointerdown', 200, 600)
    pointer(stageEl, 'pointermove', 300, 300)
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 2000, clientY: 2000 }))
    const left = nb.style.left
    pointer(stageEl, 'pointermove', 700, 400)
    expect(nb.style.left).toBe(left)
    expect(onRevealed).not.toHaveBeenCalled()
  })
})
