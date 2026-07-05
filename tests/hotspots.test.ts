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
