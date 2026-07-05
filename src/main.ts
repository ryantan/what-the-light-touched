import { createStage } from './app'
import { loadGame } from './data/load'
import { Store, makeInitialState, fractureTier } from './state/store'
import { pickAdapter } from './state/persist'
import { Stage } from './engine/stage'
import { HotspotLayer } from './engine/hotspots'
import { TextBox } from './engine/textbox'
import { FractureSystem } from './engine/fractures'
import { InteractionController } from './engine/interactions'
import { RoomManager } from './engine/rooms'
import { PuzzleWatcher } from './engine/puzzles'
import { NotebookDrag } from './engine/drag'
import { AudioManager } from './engine/audio'
import { InventoryView } from './ui/inventory'
import { PauseMenu } from './ui/menu'
import { runEffects, type EffectContext } from './engine/effects'
import type { GameData, Hotspot } from './types'
import type { SaveState } from './state/store'

/** Discard a save that points at a room the loaded game no longer has, and
 *  drop any plate overrides for rooms/plates that no longer exist. */
function sanitizeSave(saved: SaveState | null, game: GameData): SaveState | null {
  if (!saved) return null
  if (!game.rooms.some(r => r.id === saved.currentRoom)) return makeInitialState(game.startRoom)
  const plateOverrides: SaveState['plateOverrides'] = {}
  for (const [roomId, plateId] of Object.entries(saved.plateOverrides)) {
    const room = game.rooms.find(r => r.id === roomId)
    if (room && room.plates.some(p => p.id === plateId)) plateOverrides[roomId as SaveState['currentRoom']] = plateId
  }
  return { ...saved, plateOverrides }
}

async function boot() {
  const root = document.getElementById('root')!
  const stageEl = createStage(root)
  const game = await loadGame('game.json')

  const adapter = await pickAdapter()
  const saved = sanitizeSave(await adapter.load(), game)
  const store = new Store(saved ?? makeInitialState(game.startRoom))
  const autosave = () => { void adapter.save(store.snapshot()) }

  let finaleLaunched = false

  const stage = new Stage(stageEl)
  const textBox = new TextBox(stageEl)
  const audio = new AudioManager()
  const fractures = new FractureSystem(store, game.fractureShifts)
  new InventoryView(stageEl, store)

  const hotspotById = new Map<string, Hotspot>()
  for (const room of game.rooms) for (const h of room.hotspots) hotspotById.set(h.id, h)

  const ctx: EffectContext = {
    store,
    goToRoom: room => { void rooms.enter(room).then(autosave) },
    setPlate: (room, plateId) => {
      store.setPlateOverride(room, plateId)
      if (store.currentRoom() === room) void rooms.refreshPlate()
    },
    playSting: id => audio.sting(id),
    registerFracture: id => fractures.register(id),
    startFinale: () => {
      if (finaleLaunched) return
      finaleLaunched = true
      hotspots.setScene([], [], () => true)
      void import('./engine/finale').then(m => new m.Finale({ store, textBox, stage, game, audio }).start())
    },
  }
  fractures.setContext(ctx)

  const controller = new InteractionController({
    textBox, fractures, ctx,
    hooks: {
      onExamineShown: () => audio.exitSilence(),
      onLookAgainShown: () => audio.enterSilence(),
    },
  })

  const hotspots = new HotspotLayer(stageEl, {
    onHotspot: id => {
      const h = hotspotById.get(id)
      if (h) controller.handleHotspotClick(h)
    },
    onExit: to => rooms.handleExitClick(to),
  })

  const rooms = new RoomManager({
    game, store, stage, hotspots, textBox, autosave,
    onRoomEntered: room => {
      audio.playRoomTone(room.id)
      audio.setDetuneTier(fractureTier(store.fractureCount()))
      syncBathroomDrag(room.id)
    },
  })

  new PuzzleWatcher(store, game.puzzles, ctx).start()

  // The game's only drag interaction, fully described by game.drag (so the
  // Task 17 simulator can model it from data alone)
  const dragCfg = game.drag
  const drag = dragCfg
    ? new NotebookDrag({
        stageEl,
        glowPolygon: dragCfg.glowPolygon,
        onRevealed: () => {
          runEffects(dragCfg.onRevealed, ctx)
          drag!.hide()
          void textBox.showNarration('notebook', dragCfg.revealText)
          autosave()
        },
      })
    : null
  const syncBathroomDrag = (roomId: string) => {
    if (!drag || !dragCfg) return
    if (roomId === dragCfg.room && store.hasItem(dragCfg.item) && !store.getFlag(dragCfg.revealedFlag)) {
      drag.show(dragCfg.spawnAt)
    } else {
      drag.hide()
    }
  }
  store.subscribe(() => syncBathroomDrag(store.currentRoom()))

  // Detune reacts to fracture count as it grows
  store.subscribe(() => audio.setDetuneTier(fractureTier(store.fractureCount())))

  // Audio needs a user gesture
  stageEl.addEventListener('click', () => audio.init(), { once: true })

  // Pause menu and accessibility controls
  new PauseMenu(stageEl, { audio, textBox, hotspots })

  await rooms.enter(store.currentRoom())
}

void boot()
