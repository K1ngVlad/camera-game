import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { SaveData, SessionState } from '../game/types'
import { DEFAULT_SAVE, defaultSession } from '../game/reduce'

function parseSave(raw: unknown): SaveData {
  try {
    if (typeof raw !== 'object' || raw === null) return DEFAULT_SAVE
    const obj = raw as Record<string, unknown>
    if (obj['version'] !== 1) return DEFAULT_SAVE
    if (!Array.isArray(obj['found'])) return DEFAULT_SAVE
    return { version: 1, found: obj['found'] as SaveData['found'] }
  } catch {
    return DEFAULT_SAVE
  }
}

// Persistent save — version-checked, resilient to bad JSON
export const saveAtom = atomWithStorage<SaveData>('purr-save', DEFAULT_SAVE, {
  getItem(key, initialValue) {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initialValue
      return parseSave(JSON.parse(raw))
    } catch {
      return initialValue
    }
  },
  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },
  removeItem(key) {
    localStorage.removeItem(key)
  },
})

// Session state — not persisted
export const sessionAtom = atom<SessionState>(defaultSession())
