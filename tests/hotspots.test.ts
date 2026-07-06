import { describe, it, expect, vi } from 'vitest'
import { HotspotLayer } from '../src/engine/hotspots'
import { makeTinyGame } from './fixtures'

const setup = () => {
  const el = document.createElement('div')
  const onHotspot = vi.fn()
  const onExit = vi.fn()
  const layer = new HotspotLayer(el, { onHotspot, onExit })
  return { el, layer, onHotspot, onExit }
}

describe('HotspotLayer', () => {
  it('renders one polygon per visible hotspot and exit', () => {
    const { el, layer } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, () => true)
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(2)
    expect(el.querySelectorAll('polygon[data-exit]').length).toBe(1)
  })

  it('omits hotspots whose visibility predicate is false', () => {
    const { el, layer } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, h => h.id !== 'mail-pile')
    expect(el.querySelectorAll('polygon[data-id]').length).toBe(1)
  })

  it('classes exits by direction so CSS can show a directional cursor', () => {
    const { el, layer } = setup()
    layer.setScene([], [
      { to: 'kitchen', polygon: [[1100, 200], [1280, 200], [1280, 600], [1100, 600]] },
      { to: 'entry', polygon: [[0, 200], [80, 200], [80, 600], [0, 600]] },
      { to: 'bathroom', polygon: [[545, 230], [705, 230], [705, 385], [545, 385]] },
    ], () => true)
    expect(el.querySelector('polygon[data-exit="kitchen"]')!.classList.contains('exit-right')).toBe(true)
    expect(el.querySelector('polygon[data-exit="entry"]')!.classList.contains('exit-left')).toBe(true)
    expect(el.querySelector('polygon[data-exit="bathroom"]')!.classList.contains('exit-up')).toBe(true)
  })

  it('dispatches clicks to the right handler', () => {
    const { el, layer, onHotspot, onExit } = setup()
    const room = makeTinyGame().rooms[0]!
    layer.setScene(room.hotspots, room.exits, () => true)
    el.querySelector<SVGPolygonElement>('polygon[data-id="coat-rack"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onHotspot).toHaveBeenCalledWith('coat-rack')
    el.querySelector<SVGPolygonElement>('polygon[data-exit="living"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onExit).toHaveBeenCalledWith('living')
  })

  it('toggles the breathe class', () => {
    const { el, layer } = setup()
    layer.setBreathe(true)
    expect(el.querySelector('svg.hotspots')!.classList.contains('breathe')).toBe(true)
    layer.setBreathe(false)
    expect(el.querySelector('svg.hotspots')!.classList.contains('breathe')).toBe(false)
  })
})
