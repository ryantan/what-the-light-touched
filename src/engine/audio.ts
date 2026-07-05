import type { RoomId } from '../types'

const ROOM_FREQ: Record<RoomId, number> = {
  entry: 55, living: 50, kitchen: 60, bathroom: 48, bedroom: 44,
}
const DETUNE: Record<0 | 1 | 2 | 3, number> = { 0: 1, 1: 0.997, 2: 0.993, 3: 0.988 }

export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private toneOsc: OscillatorNode | null = null
  private room: RoomId | null = null
  private silenced = false
  private detune = 1
  private volume = 1

  constructor(private ctxFactory: () => AudioContext = () => new AudioContext()) {}

  init(): void {
    if (this.ctx) return
    this.ctx = this.ctxFactory()
    this.master = this.ctx.createGain()
    this.master.connect(this.ctx.destination)
    this.applyGain()
  }

  state() {
    return { room: this.room, silenced: this.silenced, detune: this.detune, volume: this.volume }
  }

  playRoomTone(room: RoomId): void {
    this.room = room
    if (!this.ctx || !this.master) return
    this.toneOsc?.stop()
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = ROOM_FREQ[room]
    const g = this.ctx.createGain()
    g.gain.value = 0.05
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    this.toneOsc = osc
  }

  setDetuneTier(tier: 0 | 1 | 2 | 3): void {
    this.detune = DETUNE[tier]
    // OscillatorNode has no playbackRate in the DOM types; the placeholder synth
    // fakes one so the real AudioBufferSourceNode loop is a drop-in later.
    if (this.toneOsc) (this.toneOsc as any).playbackRate.value = this.detune
  }

  enterSilence(): void { this.silenced = true; this.applyGain() }
  exitSilence(): void { this.silenced = false; this.applyGain() }

  setVolume(v: number): void { this.volume = v; this.applyGain() }

  sting(_id: string): void {
    if (!this.ctx || !this.master || this.silenced) return
    const osc = this.ctx.createOscillator()
    osc.frequency.value = 220
    const g = this.ctx.createGain()
    g.gain.value = 0.1
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop((this.ctx.currentTime ?? 0) + 0.3)
  }

  private applyGain(): void {
    if (this.master) this.master.gain.value = this.silenced ? 0 : this.volume
  }
}
