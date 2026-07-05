import type { PuzzleRule } from '../types'
import type { Store } from '../state/store'
import { runEffects, type EffectContext } from './effects'

export class PuzzleWatcher {
  private checking = false

  constructor(
    private store: Store,
    private puzzles: PuzzleRule[],
    private ctx: EffectContext,
  ) {}

  start(): void {
    this.store.subscribe(() => this.check())
    this.check()
  }

  private check(): void {
    if (this.checking) return // effects mutate the store; don't recurse
    this.checking = true
    try {
      let solvedAny = true
      while (solvedAny) {
        solvedAny = false
        for (const p of this.puzzles) {
          const solvedFlag = `solved:${p.id}`
          if (this.store.getFlag(solvedFlag)) continue
          if (p.requiresFlags.every(f => this.store.getFlag(f))) {
            this.store.setFlag(solvedFlag)
            runEffects(p.onSolve, this.ctx)
            solvedAny = true
          }
        }
      }
    } finally {
      this.checking = false
    }
  }
}
