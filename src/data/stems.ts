import type { MusicConfig } from '../audio/clock'

export type StemId = 'drums' | 'bass' | 'keys' | 'pumpkin' | 'choir' | 'trumpet' | 'pop' | 'bongo'

export const STEM_IDS: StemId[] = [
  'drums',
  'bass',
  'keys',
  'pumpkin',
  'choir',
  'trumpet',
  'pop',
  'bongo',
]

export const MUSIC_CONFIG: MusicConfig = {
  bpm: 120,
  beatsPerBar: 4,
  bars: 16,
}

export interface StemMix {
  gain: number
  cutoff: number
}

/** Default "everything on" mix for sandbox. */
export function defaultMix(): Record<StemId, StemMix> {
  const mix = {} as Record<StemId, StemMix>
  for (const id of STEM_IDS) mix[id] = { gain: 1.0, cutoff: 20000 }
  return mix
}

export const PLACEHOLDER_STEMS: Record<StemId, string> = {
  drums: './assets/audio/placeholder/drums.wav',
  bass: './assets/audio/placeholder/bass.wav',
  keys: './assets/audio/placeholder/keys.wav',
  pumpkin: './assets/audio/placeholder/pumpkin.wav',
  choir: './assets/audio/placeholder/choir.wav',
  trumpet: './assets/audio/placeholder/trumpet.wav',
  pop: './assets/audio/placeholder/pop.wav',
  bongo: './assets/audio/placeholder/bongo.wav',
}

export const PLACEHOLDER_SFX = {
  horn: './assets/audio/placeholder/horn.wav',
}

/** Cat animation configuration — lives in data so both render and tests can import it. */
export interface CatAnimConfig {
  squash: number
  axis: 'x' | 'y'
  frameMode: 'none' | 'momentary' | 'latch'
  frames: string[]
  breathe?: number
}

export const CAT_ANIM_CONFIGS: Record<StemId, CatAnimConfig> = {
  drums: { squash: 0.15, axis: 'y', frameMode: 'momentary', frames: ['cat_a', 'cat_b'] },
  bass: { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['cat_a'] },
  keys: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['cat_a'] },
  pumpkin: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['cat_a'] },
  choir: { squash: 0.08, axis: 'y', frameMode: 'none', frames: ['cat_a'] },
  trumpet: { squash: 0.12, axis: 'x', frameMode: 'none', frames: ['cat_a'] },
  pop: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['cat_a'] },
  bongo: { squash: 0.18, axis: 'y', frameMode: 'latch', frames: ['cat_a', 'cat_b'] },
}
