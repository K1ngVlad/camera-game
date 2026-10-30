import type { CatId, Tool } from '../data/cats'
import { CATS, ENABLED_CATS, CAT_MAP } from '../data/cats'
import { INITIAL_OPEN_CAMERAS, neighbors } from '../data/cameras'

export function openCameras(found: CatId[]): number[] {
  const open = new Set(INITIAL_OPEN_CAMERAS)
  for (const id of found) {
    const cat = CAT_MAP.get(id)
    if (cat) cat.unlocks.cameras.forEach((c) => open.add(c))
  }
  return Array.from(open).sort((a, b) => a - b)
}

export function unlockedTools(found: CatId[]): Tool[] {
  const tools = new Set<Tool>()
  for (const id of found) {
    const cat = CAT_MAP.get(id)
    if (cat) cat.unlocks.tools.forEach((t) => tools.add(t))
  }
  return Array.from(tools)
}

export function currentCat(found: CatId[]): CatId | null {
  for (const cat of ENABLED_CATS) {
    if (!found.includes(cat.id)) return cat.id
  }
  return null
}

export function isStageOpen(found: CatId[]): boolean {
  return found.length >= 3
}

export function isGameComplete(found: CatId[]): boolean {
  return ENABLED_CATS.every((c) => found.includes(c.id))
}

export function isNeighborCamera(camera: number, targetCamera: number): boolean {
  return neighbors(targetCamera).includes(camera)
}

// Tools available at start of searching a cat (granted before finding it)
export function grantedToolsForCurrent(found: CatId[]): Tool[] {
  const current = currentCat(found)
  if (!current) return []
  const cat = CAT_MAP.get(current)
  return cat?.grantsOnStart ?? []
}

// All tools available to player (found unlocks + granted for current)
export function availableTools(found: CatId[]): Tool[] {
  const tools = new Set(unlockedTools(found))
  for (const t of grantedToolsForCurrent(found)) tools.add(t)
  return Array.from(tools)
}

// Order of enabled cats for display
export function enabledCatsInOrder(): typeof CATS {
  return ENABLED_CATS
}
