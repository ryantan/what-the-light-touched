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
import { runEffects, type EffectContext } from './engine/effects'
import type { Hotspot } from './types'

async function boot() {
  const root = document.getElementById('root')!
  const stageEl = createStage(root)
  const game = await loadGame('game.json')

  const adapter = await pickAdapter()
  const saved = await adapter.load()
  const store = new Store(saved ?? makeInitialState(game.startRoom))
  const autosave = () => { void adapter.save(store.snapshot()) }

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
    startFinale: () => { void import('./engine/finale').then(m => new m.Finale({ store, textBox, stage, game, audio }).start()) },
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

  // Audio needs a user gesture; breathe mode on space (toggle wired properly in Task 19)
  stageEl.addEventListener('click', () => audio.init(), { once: true })
  window.addEventListener('keydown', e => { if (e.code === 'Space') hotspots.setBreathe(true) })
  window.addEventListener('keyup', e => { if (e.code === 'Space') hotspots.setBreathe(false) })

  await rooms.enter(store.currentRoom())
}

void boot()
