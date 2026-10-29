// Pure animation math — no Pixi/React/Web Audio imports, fully testable

import type { CatAnimConfig } from '../data/stems'

export type { CatAnimConfig }

export interface ScaleResult {
  sx: number
  sy: number
}

/**
 * Volume-preserving squash & stretch.
 * Pivot at feet (anchor 0.5, 1), so stretch axis drives visual bounce.
 * When amplitude is below breathe threshold, substitute sine breathing.
 */
export function computeScale(
  amplitude: number,
  cfg: CatAnimConfig,
  timeSec: number,
): ScaleResult {
  const breatheThreshold = 0.05
  const breatheAmp = cfg.breathe ?? 0.015
  const k = cfg.squash

  let a = amplitude
  if (a < breatheThreshold) {
    a = breatheAmp * Math.sin((timeSec * 2 * Math.PI) / 2.5)
  }

  if (cfg.axis === 'y') {
    const sy = 1 + k * a
    const sx = sy > 0 ? 1 / sy : 1
    return { sx, sy }
  } else {
    const sx = 1 + k * a
    const sy = sx > 0 ? 1 / sx : 1
    return { sx, sy }
  }
}

/**
 * Compute the next frame index based on onset state.
 * Returns a frame index into cfg.frames.
 */
export function nextFrame(
  currentFrame: number,
  onset: boolean,
  cfg: CatAnimConfig,
  prevOnset: boolean,
): number {
  if (cfg.frames.length === 0) return 0

  switch (cfg.frameMode) {
    case 'none':
      return 0

    case 'momentary':
      return onset && cfg.frames.length > 1 ? 1 : 0

    case 'latch': {
      // Advance frame on leading edge of onset
      if (onset && !prevOnset) {
        return (currentFrame + 1) % cfg.frames.length
      }
      return currentFrame
    }
  }
}
