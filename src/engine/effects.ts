import type { Condition, Effect, RoomId } from '../types'
import type { Store } from '../state/store'

export interface EffectContext {
  store: Store
  goToRoom(room: RoomId): void
  setPlate(room: RoomId, plateId: string): void
  playSting(id: string): void
  registerFracture(id: string): void
  startFinale(): void
}

export function checkConditions(conds: Condition[] | undefined, store: Store): boolean {
  for (const c of conds ?? []) {
    switch (c.kind) {
      case 'flag':
        if (store.getFlag(c.name) !== (c.is ?? true)) return false
        break
      case 'hasItem':
        if (!store.hasItem(c.item)) return false
        break
      case 'fracturesAtLeast':
        if (store.fractureCount() < c.value) return false
        break
    }
  }
  return true
}

export function runEffects(effects: Effect[] | undefined, ctx: EffectContext): void {
  for (const e of effects ?? []) {
    switch (e.kind) {
      case 'setFlag': ctx.store.setFlag(e.name, e.value ?? true); break
      case 'addItem': ctx.store.addItem(e.item); break
      case 'setPlate': ctx.setPlate(e.room, e.plate); break
      case 'goToRoom': ctx.goToRoom(e.room); break
      case 'sting': ctx.playSting(e.id); break
      case 'registerFracture': ctx.registerFracture(e.id); break
      case 'startFinale': ctx.startFinale(); break
    }
  }
}
