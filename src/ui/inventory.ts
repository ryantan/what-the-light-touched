import type { Store } from '../state/store'

const LABELS: Record<string, string> = {
  keyring: "Edith's keys",
  polaroid: 'Polaroid camera',
  notebook: 'Notebook',
}

export class InventoryView {
  private el: HTMLElement

  constructor(stageEl: HTMLElement, private store: Store) {
    this.el = document.createElement('div')
    this.el.className = 'inventory hidden'
    stageEl.append(this.el)
    store.subscribe(() => this.refresh())
    this.refresh()
  }

  refresh(): void {
    const items = this.store.items()
    this.el.classList.toggle('hidden', items.length === 0)
    this.el.replaceChildren()
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div')
      slot.className = 'slot'
      const item = items[i]
      if (item) {
        slot.classList.add('filled')
        slot.setAttribute('data-item', item)
        slot.textContent = LABELS[item] ?? item
      }
      this.el.append(slot)
    }
  }
}
