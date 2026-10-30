import type { TrackTiming } from '../audio/clock'
import type { CatId } from './cats'

export const SONG_TIMING: TrackTiming = {
  bpm: 120,
  beatsPerBar: 4,
  bars: 34,
  loopStartBar: 0,
  loopEndBar: 34,
  // TODO: confirm loop boundaries with composer
}

const DEFAULT_CAM: TrackTiming = { bpm: 120, beatsPerBar: 4, bars: 4 }

export const CAMERA_TIMING: Record<CatId, TrackTiming> = {
  drummer:  { ...DEFAULT_CAM },
  longcat:  { ...DEFAULT_CAM },
  keyboard: { ...DEFAULT_CAM },
  pumpkin:  { ...DEFAULT_CAM },
  choir:    { ...DEFAULT_CAM },
  trumpet:  { ...DEFAULT_CAM },  // phrase 1 bar, silent 1 bar; loop covers both
  popcat:   { ...DEFAULT_CAM },
  bongo:    { ...DEFAULT_CAM },
}
