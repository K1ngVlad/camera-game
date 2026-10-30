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

// Only explicit overrides — omit a cat to auto-detect bars from buffer duration.
// Example: { trumpet: { bars: 2 } } forces a 2-bar loop regardless of file length.
export const CAMERA_TIMING: Partial<Record<CatId, Partial<TrackTiming>>> = {}
