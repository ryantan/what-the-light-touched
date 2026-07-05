import type { ItemId, RoomId } from '../types'

export interface SaveState {
  flags: Record<string, boolean>
  fractures: string[]
  items: ItemId[]
  currentRoom: RoomId
  plateOverrides: Partial<Record<RoomId, string>>
}

export function makeInitialState(startRoom: RoomId): SaveState {
  return { flags: {}, fractures: [], items: [], currentRoom: startRoom, plateOverrides: {} }
}

export function fractureTier(count: number): 0 | 1 | 2 | 3 {
  if (count >= 7) return 3
  if (count >= 5) return 2
  if (count >= 3) return 1
  return 0
}

export class Store {
  private listeners = new Set<(s: SaveState) => void>()

  constructor(private state: SaveState) {}

  private emit() { const snap = this.snapshot(); for (const fn of this.listeners) fn(snap) }

  getFlag(name: string): boolean { return this.state.flags[name] === true }
  setFlag(name: string, value = true): void { this.state.flags[name] = value; this.emit() }

  hasItem(item: ItemId): boolean { return this.state.items.includes(item) }
  addItem(item: ItemId): void {
    if (this.hasItem(item)) return
    this.state.items.push(item)
    this.emit()
  }
  items(): ItemId[] { return [...this.state.items] }

  registerFracture(id: string): boolean {
    if (this.state.fractures.includes(id)) return false
    this.state.fractures.push(id)
    this.emit()
    return true
  }
  fractureCount(): number { return this.state.fractures.length }
  fractureIds(): string[] { return [...this.state.fractures] }

  currentRoom(): RoomId { return this.state.currentRoom }
  setRoom(room: RoomId): void { this.state.currentRoom = room; this.emit() }

  plateOverride(room: RoomId): string | undefined { return this.state.plateOverrides[room] }
  setPlateOverride(room: RoomId, plateId: string): void {
    this.state.plateOverrides[room] = plateId
    this.emit()
  }

  subscribe(fn: (s: SaveState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  snapshot(): SaveState { return JSON.parse(JSON.stringify(this.state)) }
}
