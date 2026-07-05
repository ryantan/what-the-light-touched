import type { GameData } from '../src/types'

export function makeTinyGame(): GameData {
  return {
    startRoom: 'entry',
    fractureIds: ['f1'],
    rooms: [
      {
        id: 'entry',
        name: 'Entry Hall',
        plates: [{ id: 'base', src: 'photos/entry-base.svg' }],
        hotspots: [
          {
            id: 'coat-rack',
            polygon: [[10, 10], [100, 10], [100, 100], [10, 100]],
            examine: 'MARA: Her coat rack.',
            lookAgain: 'A coat rack. Three empty hooks.',
          },
          {
            id: 'mail-pile',
            polygon: [[200, 10], [300, 10], [300, 100], [200, 100]],
            examine: 'MARA: Just junk mail.',
            lookAgain: 'Unopened letters addressed to two different names.',
            fractureId: 'f1',
            onExamine: [{ kind: 'setFlag', name: 'sawMail' }],
          },
        ],
        exits: [
          {
            to: 'living',
            polygon: [[1100, 200], [1280, 200], [1280, 600], [1100, 600]],
            unlockedWhen: [{ kind: 'flag', name: 'sawMail' }],
            lockedText: "MARA: Let's not rush. Look around first.",
          },
        ],
      },
      {
        id: 'living',
        name: 'Living Room',
        plates: [
          { id: 'base', src: 'photos/living-base.svg' },
          { id: 'shifted', src: 'photos/living-shifted.svg' },
        ],
        hotspots: [
          {
            id: 'chair',
            polygon: [[400, 300], [600, 300], [600, 500], [400, 500]],
            examine: 'MARA: Her reading chair.',
            lookAgain: 'A chair facing the wall.',
            onLookAgain: [{ kind: 'startFinale' }],
          },
        ],
        exits: [{ to: 'entry', polygon: [[0, 200], [80, 200], [80, 600], [0, 600]] }],
      },
    ],
    puzzles: [],
    fractureShifts: [],
    finale: {
      beats: ['She was at peace here. I am certain of that.'],
      accuseBeatIndex: 0,
      accuseWord: 'certain',
      minFractures: 1,
      endingA: ['You pack the last box.'],
      endingB: {
        corrupt: [['She was at peace.', 'The chair faced the wall.']],
        mirrorLookAgain: 'A mirror. You look again.',
      },
    },
  }
}
