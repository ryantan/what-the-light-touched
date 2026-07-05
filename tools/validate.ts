import { readFileSync } from 'node:fs'
import { validateGameData } from '../src/data/validate'
import { simulate } from '../src/tools/reachability'
import type { GameData } from '../src/types'

const game = JSON.parse(readFileSync('public/game.json', 'utf8')) as GameData

const schemaErrors = validateGameData(game)
if (schemaErrors.length > 0) {
  console.error('SCHEMA ERRORS:')
  for (const e of schemaErrors) console.error('  -', e)
  process.exit(1)
}

const canonErrors: string[] = []
if (game.fractureIds.length !== 7) canonErrors.push(`fractureIds must have length 7, got ${game.fractureIds.length}`)
for (const shift of game.fractureShifts) {
  if (![3, 5, 7].includes(shift.at)) canonErrors.push(`fractureShifts[].at must be one of 3, 5, 7, got ${shift.at}`)
}
if (game.finale.minFractures !== 5) canonErrors.push(`finale.minFractures must be 5, got ${game.finale.minFractures}`)
if (canonErrors.length > 0) {
  console.error('CANON ERRORS:')
  for (const e of canonErrors) console.error('  -', e)
  process.exit(1)
}

const r = simulate(game)
console.log(`rooms reached:      ${r.reachedRooms.length}/${game.rooms.length}`)
console.log(`hotspots reachable: ${r.examinedHotspots.length}`)
console.log(`fractures:          ${r.fractures.length}/${game.fractureIds.length}`)
console.log(`ending A reachable: ${r.endingAReachable}`)
console.log(`ending B reachable: ${r.endingBReachable}`)
if (r.errors.length > 0) {
  console.error('REACHABILITY ERRORS:')
  for (const e of r.errors) console.error('  -', e)
  process.exit(1)
}
console.log('OK — game is completable.')
