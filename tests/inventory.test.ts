import { describe, it, expect } from 'vitest'
import { InventoryView } from '../src/ui/inventory'
import { Store, makeInitialState } from '../src/state/store'

const setup = () => {
  const store = new Store(makeInitialState('entry'))
  const el = document.createElement('div')
  new InventoryView(el, store)
  return { store, el }
}

describe('InventoryView', () => {
  it('is hidden until the first item is found', () => {
    const { store, el } = setup()
    const inv = el.querySelector('.inventory')!
    expect(inv.classList.contains('hidden')).toBe(true)
    store.addItem('keyring')
    expect(inv.classList.contains('hidden')).toBe(false)
  })

  it('always renders exactly 3 slots, filled in order found', () => {
    const { store, el } = setup()
    store.addItem('keyring')
    store.addItem('notebook')
    const slots = el.querySelectorAll('.inventory .slot')
    expect(slots.length).toBe(3)
    expect(el.querySelectorAll('.slot.filled').length).toBe(2)
    expect(slots[0]!.getAttribute('data-item')).toBe('keyring')
    expect(slots[1]!.getAttribute('data-item')).toBe('notebook')
    expect(slots[2]!.getAttribute('data-item')).toBeNull()
  })
})
