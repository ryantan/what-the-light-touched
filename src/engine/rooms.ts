import type { GameData, Room, RoomId } from '../types'
import type { Store } from '../state/store'
import type { Stage } from './stage'
import type { HotspotLayer } from './hotspots'
import type { TextBox } from './textbox'
import { checkConditions } from './effects'

export class RoomManager {
  constructor(private deps: {
    game: GameData
    store: Store
    stage: Stage
    hotspots: HotspotLayer
    textBox: TextBox
    autosave: () => void
    onRoomEntered?: (room: Room) => void
  }) {}

  currentRoomData(): Room {
    const id = this.deps.store.currentRoom()
    const room = this.deps.game.rooms.find(r => r.id === id)
    if (!room) throw new Error(`unknown room ${id}`)
    return room
  }

  async enter(roomId: RoomId): Promise<void> {
    const { store, hotspots, textBox } = this.deps
    store.setRoom(roomId)
    const room = this.currentRoomData()
    textBox.clear()
    hotspots.setScene(room.hotspots, room.exits, h => checkConditions(h.visibleWhen, store))
    this.deps.onRoomEntered?.(room)
    await this.refreshPlate()
  }

  async refreshPlate(): Promise<void> {
    const room = this.currentRoomData()
    const overrideId = this.deps.store.plateOverride(room.id)
    const plate = room.plates.find(p => p.id === overrideId) ?? room.plates[0]!
    await this.deps.stage.showPlate(plate.src)
  }

  handleExitClick(to: string): void {
    const room = this.currentRoomData()
    const exit = room.exits.find(x => x.to === to)
    if (!exit) return
    if (!checkConditions(exit.unlockedWhen, this.deps.store)) {
      void this.deps.textBox.showNarration(`exit:${to}`, exit.lockedText ?? '...')
      return
    }
    void this.enter(exit.to).then(() => this.deps.autosave())
  }
}
