import type { Exit, Hotspot } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Which way an exit leads, judged by where it sits on the 1280-wide stage.
 *  Drives the directional cursor — the only visual affordance exits get. */
const exitDirection = (points: [number, number][]): 'exit-left' | 'exit-right' | 'exit-up' => {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length
  if (cx < 400) return 'exit-left'
  if (cx > 880) return 'exit-right'
  return 'exit-up'
}

export interface HotspotHandlers {
  onHotspot(id: string): void
  onExit(to: string): void
}

export class HotspotLayer {
  private svg: SVGSVGElement
  private hotspots: Hotspot[] = []
  private exits: Exit[] = []
  private isVisible: (h: Hotspot) => boolean = () => true

  constructor(stageEl: HTMLElement, private handlers: HotspotHandlers) {
    this.svg = document.createElementNS(SVG_NS, 'svg')
    this.svg.setAttribute('class', 'hotspots')
    this.svg.setAttribute('viewBox', '0 0 1280 720')
    this.svg.setAttribute('width', '1280')
    this.svg.setAttribute('height', '720')
    this.svg.addEventListener('click', e => {
      const poly = (e.target as Element).closest('polygon')
      if (!poly) return
      const id = poly.getAttribute('data-id')
      const exit = poly.getAttribute('data-exit')
      if (id) this.handlers.onHotspot(id)
      else if (exit) this.handlers.onExit(exit)
    })
    stageEl.append(this.svg)
  }

  setScene(hotspots: Hotspot[], exits: Exit[], isVisible: (h: Hotspot) => boolean): void {
    this.hotspots = hotspots
    this.exits = exits
    this.isVisible = isVisible
    this.refresh()
  }

  refresh(): void {
    this.svg.replaceChildren()
    for (const h of this.hotspots) {
      if (!this.isVisible(h)) continue
      this.svg.append(this.polygon(h.polygon, 'data-id', h.id))
    }
    for (const x of this.exits) {
      const poly = this.polygon(x.polygon, 'data-exit', x.to)
      poly.classList.add(exitDirection(x.polygon))
      this.svg.append(poly)
    }
  }

  setBreathe(on: boolean): void {
    this.svg.classList.toggle('breathe', on)
  }

  private polygon(points: [number, number][], attr: string, value: string): SVGPolygonElement {
    const poly = document.createElementNS(SVG_NS, 'polygon')
    poly.setAttribute('points', points.map(p => p.join(',')).join(' '))
    poly.setAttribute(attr, value)
    return poly
  }
}
