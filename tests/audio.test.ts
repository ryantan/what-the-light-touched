import { describe, it, expect } from 'vitest'
import { AudioManager } from '../src/engine/audio'

// Minimal AudioContext stub — just enough surface for the manager.
const makeStubCtx = () => {
  const gain = () => ({
    gain: { value: 1, setTargetAtTime: () => {} },
    connect: () => {},
  })
  return {
    createGain: gain,
    createOscillator: () => ({
      type: 'sine', frequency: { value: 0 }, playbackRate: { value: 1 },
      connect: () => {}, start: () => {}, stop: () => {},
    }),
    createBiquadFilter: () => ({ type: 'lowpass', frequency: { value: 0 }, connect: () => {} }),
    destination: {}, currentTime: 0,
  } as unknown as AudioContext
}

describe('AudioManager', () => {
  const make = () => {
    const a = new AudioManager(() => makeStubCtx())
    a.init()
    return a
  }

  it('tracks the current room tone', () => {
    const a = make()
    expect(a.state().room).toBeNull()
    a.playRoomTone('living')
    expect(a.state().room).toBe('living')
  })

  it('hard silence mutes and exit restores', () => {
    const a = make()
    a.setVolume(0.8)
    a.enterSilence()
    expect(a.state().silenced).toBe(true)
    a.exitSilence()
    expect(a.state().silenced).toBe(false)
    expect(a.state().volume).toBe(0.8)
  })

  it('maps fracture tiers to detune rates', () => {
    const a = make()
    a.setDetuneTier(0)
    expect(a.state().detune).toBe(1)
    a.setDetuneTier(2)
    expect(a.state().detune).toBe(0.993)
    a.setDetuneTier(3)
    expect(a.state().detune).toBe(0.988)
  })

  it('is safe to call before init (no-ops, no throw)', () => {
    const a = new AudioManager(() => makeStubCtx())
    expect(() => {
      a.playRoomTone('entry')
      a.enterSilence()
      a.sting('shutter')
    }).not.toThrow()
  })

  it('applies the current detune to a newly created room tone', () => {
    const oscs: any[] = []
    const stub = {
      createGain: () => ({ gain: { value: 1, setTargetAtTime: () => {} }, connect: () => {} }),
      createOscillator: () => {
        const o = { type: 'sine', frequency: { value: 0 }, playbackRate: { value: 1 }, connect: () => {}, start: () => {}, stop: () => {} }
        oscs.push(o)
        return o
      },
      createBiquadFilter: () => ({ type: 'lowpass', frequency: { value: 0 }, connect: () => {} }),
      destination: {}, currentTime: 0,
    } as unknown as AudioContext
    const a = new AudioManager(() => stub)
    a.init()
    a.setDetuneTier(2)
    a.playRoomTone('living')
    expect(oscs[oscs.length - 1].playbackRate.value).toBe(0.993)
  })

  it('starts the recorded room tone on init, so the first room gets ambience', () => {
    const oscs: any[] = []
    const stub = {
      createGain: () => ({ gain: { value: 1, setTargetAtTime: () => {} }, connect: () => {} }),
      createOscillator: () => {
        const o = { type: 'sine', frequency: { value: 0 }, playbackRate: { value: 1 }, connect: () => {}, start: () => {}, stop: () => {} }
        oscs.push(o)
        return o
      },
      createBiquadFilter: () => ({ type: 'lowpass', frequency: { value: 0 }, connect: () => {} }),
      destination: {}, currentTime: 0,
    } as unknown as AudioContext
    const a = new AudioManager(() => stub)
    a.playRoomTone('entry')
    expect(oscs.length).toBe(0)
    a.init()
    expect(oscs.length).toBe(1)
    expect(oscs[0].frequency.value).toBe(55)
  })
})
