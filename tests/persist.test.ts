import { describe, it, expect } from 'vitest'
import { MemoryAdapter, pickAdapter, encodeSaveCode, decodeSaveCode } from '../src/state/persist'
import { makeInitialState } from '../src/state/store'

describe('persistence', () => {
  it('MemoryAdapter round-trips a save', async () => {
    const a = new MemoryAdapter()
    expect(await a.load()).toBeNull()
    const s = makeInitialState('entry')
    s.flags['x'] = true
    await a.save(s)
    expect((await a.load())?.flags['x']).toBe(true)
  })

  it('save codes round-trip', () => {
    const s = makeInitialState('living')
    s.fractures.push('f1', 'f2')
    const decoded = decodeSaveCode(encodeSaveCode(s))
    expect(decoded?.currentRoom).toBe('living')
    expect(decoded?.fractures).toEqual(['f1', 'f2'])
  })

  it('decodeSaveCode returns null on garbage', () => {
    expect(decodeSaveCode('not-a-save')).toBeNull()
    expect(decodeSaveCode(btoa('{"nope":1}'))).toBeNull()
  })

  it('pickAdapter falls back to memory when IndexedDB is unavailable', async () => {
    const a = await pickAdapter()
    expect(a).toBeInstanceOf(MemoryAdapter)
  })

  it('decodeSaveCode rejects codes missing required fields', () => {
    const partial = { flags: {}, fractures: [], currentRoom: 'entry' } // no items/plateOverrides
    expect(decodeSaveCode(btoa(JSON.stringify(partial)))).toBeNull()
  })

  it('decodeSaveCode rejects codes with wrong field types', () => {
    const wrong = { flags: null, fractures: 'x', items: {}, currentRoom: 1, plateOverrides: [] }
    expect(decodeSaveCode(btoa(JSON.stringify(wrong)))).toBeNull()
  })
})
