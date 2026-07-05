import type { FractureShift, Hotspot } from '../types'
import { Store, fractureTier } from '../state/store'
import { runEffects, type EffectContext } from './effects'

export class FractureSystem {
  private ctx: EffectContext | null = null

  constructor(private store: Store, private shifts: FractureShift[]) {}

  setContext(ctx: EffectContext): void { this.ctx = ctx }

  tier(): 0 | 1 | 2 | 3 { return fractureTier(this.store.fractureCount()) }

  noteExamine(h: Hotspot): void {
    this.store.setFlag(`seenExamine:${h.id}`)
  }

  noteLookAgain(h: Hotspot): void {
    this.store.setFlag(`seenLookAgain:${h.id}`)
    if (!h.fractureId) return
    if (this.store.getFlag(`seenExamine:${h.id}`)) this.register(h.fractureId)
  }

  register(id: string): void {
    if (!this.store.registerFracture(id)) return
    this.checkShifts()
  }

  private checkShifts(): void {
    if (!this.ctx) return
    const count = this.store.fractureCount()
    for (const shift of this.shifts) {
      const flag = `shiftFired:${shift.at}`
      if (count >= shift.at && !this.store.getFlag(flag)) {
        this.store.setFlag(flag)
        runEffects(shift.effects, this.ctx)
      }
    }
  }
}
