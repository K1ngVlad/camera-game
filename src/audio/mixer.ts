import type { Screen } from '../game/types'
import type { CatId } from '../data/cats'
import { CATS } from '../data/cats'
import { isNeighborCamera } from '../game/progression'

export interface CameraAudioState {
  catId: CatId
  gain: number
  cutoff: number
}

export interface SongAudioState {
  playing: boolean
  restart?: boolean
  busGain: number
  cutoff: number
  gains: Partial<Record<CatId, number>>
}

export interface AudioStateInput {
  screen: Screen
  camera: number
  found: CatId[]
  currentCat: CatId | null
}

const OPEN = 20000

export function computeAudioState(input: AudioStateInput): {
  camera: CameraAudioState | null
  song: SongAudioState
} {
  const { screen, camera, found, currentCat } = input
  const enabledCats = CATS.filter((c) => c.enabled)

  switch (screen) {
    case 'menu': {
      const gains: Partial<Record<CatId, number>> = {}
      for (const cat of enabledCats) gains[cat.id] = 1.0
      return {
        camera: null,
        song: { playing: true, busGain: 0.18, cutoff: 900, gains },
      }
    }

    case 'office': {
      const gains: Partial<Record<CatId, number>> = {}
      for (const cat of enabledCats) gains[cat.id] = found.includes(cat.id) ? 1.0 : 0
      const playing = found.some((id) => enabledCats.some((c) => c.id === id))
      return {
        camera: null,
        song: { playing, busGain: 0.22, cutoff: 700, gains },
      }
    }

    case 'cameras': {
      let camState: CameraAudioState | null = null
      if (currentCat) {
        const cat = enabledCats.find((c) => c.id === currentCat)
        if (cat) {
          if (camera === cat.camera) {
            camState = { catId: currentCat, gain: 1.0, cutoff: OPEN }
          } else if (isNeighborCamera(camera, cat.camera)) {
            camState = { catId: currentCat, gain: 0.3, cutoff: 800 }
          }
        }
      }
      return {
        camera: camState,
        song: { playing: false, busGain: 0, cutoff: OPEN, gains: {} },
      }
    }

    case 'stage': {
      const gains: Partial<Record<CatId, number>> = {}
      for (const cat of enabledCats) gains[cat.id] = found.includes(cat.id) ? 1.0 : 0
      return {
        camera: null,
        song: { playing: true, busGain: 1.0, cutoff: OPEN, gains },
      }
    }
  }
}
