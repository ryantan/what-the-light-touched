import type { SaveState } from './store'

export interface StorageAdapter {
  load(): Promise<SaveState | null>
  save(s: SaveState): Promise<void>
}

export class MemoryAdapter implements StorageAdapter {
  private state: SaveState | null = null
  async load() { return this.state }
  async save(s: SaveState) { this.state = JSON.parse(JSON.stringify(s)) }
}

const DB_NAME = 'wtlt'
const STORE = 'save'
const KEY = 'slot0'

export class IdbAdapter implements StorageAdapter {
  private db: Promise<IDBDatabase>

  constructor() {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async load(): Promise<SaveState | null> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as SaveState) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async save(s: SaveState): Promise<void> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(JSON.parse(JSON.stringify(s)), KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

export async function pickAdapter(): Promise<StorageAdapter> {
  if (typeof indexedDB === 'undefined') return new MemoryAdapter()
  try {
    const idb = new IdbAdapter()
    await idb.load() // probe: throws if storage is blocked
    return idb
  } catch {
    return new MemoryAdapter()
  }
}

export function encodeSaveCode(s: SaveState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
}

export function decodeSaveCode(code: string): SaveState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(code))))
    if (!parsed || typeof parsed !== 'object') return null

    // Validate all required fields are present
    if (!('flags' in parsed) || !('fractures' in parsed) || !('items' in parsed) || !('currentRoom' in parsed) || !('plateOverrides' in parsed)) return null

    // Validate field types
    if (typeof parsed.flags !== 'object' || Array.isArray(parsed.flags) || parsed.flags === null) return null
    if (!Array.isArray(parsed.fractures)) return null
    if (!Array.isArray(parsed.items)) return null
    if (typeof parsed.currentRoom !== 'string') return null
    if (typeof parsed.plateOverrides !== 'object' || Array.isArray(parsed.plateOverrides) || parsed.plateOverrides === null) return null

    return parsed as SaveState
  } catch {
    return null
  }
}
