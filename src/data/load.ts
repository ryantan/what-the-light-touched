import type { GameData } from '../types'
import { validateGameData } from './validate'

export async function loadGame(url: string): Promise<GameData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`)
  const game = (await res.json()) as GameData
  const errors = validateGameData(game)
  if (errors.length > 0) throw new Error(`invalid game data:\n${errors.join('\n')}`)
  return game
}
