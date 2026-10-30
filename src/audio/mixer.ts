import type { Screen } from '../game/types'
import type { CatId } from '../data/cats'
import { CATS } from '../data/cats'
import { isNeighborCamera } from '../game/progression'

export interface StemMix {
  gain: number
  cutoff: number
}

export interface MixInput {
  screen: Screen
  camera: number
  found: CatId[]
}

const OPEN = 20000

// Matrix from docs/audio.md
const FOUND_STAGE: StemMix = { gain: 1.0, cutoff: OPEN }
const FOUND_AWAY: StemMix = { gain: 0.25, cutoff: 600 }
const TARGET_ON_CAM: StemMix = { gain: 1.0, cutoff: OPEN }
const TARGET_NEIGHBOR: StemMix = { gain: 0.3, cutoff: 800 }
const TARGET_FAR: StemMix = { gain: 0, cutoff: OPEN }
const NOT_IN_GAME: StemMix = { gain: 0, cutoff: OPEN }

export function computeMix(input: MixInput): Record<string, StemMix> {
  const { screen, camera, found } = input
  const result: Record<string, StemMix> = {}

  for (const cat of CATS) {
    if (!cat.enabled) {
      result[cat.stem] = NOT_IN_GAME
      continue
    }

    if (found.includes(cat.id)) {
      result[cat.stem] = screen === 'stage' ? FOUND_STAGE : FOUND_AWAY
      continue
    }

    // Current target cat (first non-found enabled cat)
    const isTarget = !found.some((f) => f === cat.id)
    const isCurrent =
      isTarget &&
      CATS.filter((c) => c.enabled)
        .filter((c) => !found.includes(c.id))
        .at(0)?.id === cat.id

    if (!isCurrent) {
      result[cat.stem] = NOT_IN_GAME
      continue
    }

    if (screen === 'cameras') {
      if (camera === cat.camera) {
        result[cat.stem] = TARGET_ON_CAM
      } else if (isNeighborCamera(camera, cat.camera)) {
        result[cat.stem] = TARGET_NEIGHBOR
      } else {
        result[cat.stem] = TARGET_FAR
      }
    } else {
      result[cat.stem] = TARGET_FAR
    }
  }

  return result
}
