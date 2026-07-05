import type { Hotspot } from '../types'
import type { TextBox } from './textbox'
import type { FractureSystem } from './fractures'
import { runEffects, type EffectContext } from './effects'

export interface InteractionHooks {
  onExamineShown?(h: Hotspot): void
  onLookAgainShown?(h: Hotspot): void
}

export class InteractionController {
  constructor(private deps: {
    textBox: TextBox
    fractures: FractureSystem
    ctx: EffectContext
    hooks?: InteractionHooks
  }) {}

  handleHotspotClick(h: Hotspot): void {
    const { textBox } = this.deps
    if (textBox.showingFor() === h.id) this.lookAgain(h)
    else this.examine(h)
  }

  private examine(h: Hotspot): void {
    const { textBox, fractures, ctx, hooks } = this.deps
    fractures.noteExamine(h)
    void textBox.showNarration(h.id, this.examineText(h))
    runEffects(h.onExamine, ctx)
    hooks?.onExamineShown?.(h)
  }

  private lookAgain(h: Hotspot): void {
    const { textBox, fractures, ctx, hooks } = this.deps
    textBox.showObjective(h.id, h.lookAgain)
    fractures.noteLookAgain(h)
    runEffects(h.onLookAgain, ctx)
    hooks?.onLookAgainShown?.(h)
  }

  /** Pick the highest tiered variant at or below the current fracture tier. */
  private examineText(h: Hotspot): string {
    const tier = this.deps.fractures.tier()
    let text = h.examine
    let best = 0
    for (const v of h.examineTiered ?? []) {
      if (v.tier <= tier && v.tier > best) { best = v.tier; text = v.text }
    }
    return text
  }
}
