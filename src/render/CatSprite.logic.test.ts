import { describe, it, expect } from 'vitest'
import { computeScale, nextFrame } from './CatSprite.logic'
import type { CatAnimConfig } from './CatSprite.logic'

const cfgY: CatAnimConfig = { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['a'] }
const cfgX: CatAnimConfig = { squash: 0.2, axis: 'x', frameMode: 'none', frames: ['a'] }

describe('computeScale', () => {
  it('volume-preserving: sx * sy ≈ 1 for axis=y', () => {
    for (const amp of [0, 0.3, 0.7, 1.0]) {
      const { sx, sy } = computeScale(amp, cfgY, 0)
      expect(sx * sy).toBeCloseTo(1, 4)
    }
  })

  it('volume-preserving: sx * sy ≈ 1 for axis=x', () => {
    for (const amp of [0, 0.3, 0.7, 1.0]) {
      const { sx, sy } = computeScale(amp, cfgX, 0)
      expect(sx * sy).toBeCloseTo(1, 4)
    }
  })

  it('sy > 1 when amplitude > 0 with axis=y', () => {
    const { sy } = computeScale(0.5, cfgY, 0)
    expect(sy).toBeGreaterThan(1)
  })

  it('sx > 1 when amplitude > 0 with axis=x', () => {
    const { sx } = computeScale(0.5, cfgX, 0)
    expect(sx).toBeGreaterThan(1)
  })

  it('breathing kicks in when amplitude < 0.05', () => {
    // At t=0.625s, sin(t*2π/2.5) = sin(π/2) = 1, so amplitude contributes
    const cfg: CatAnimConfig = { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['a'], breathe: 0.1 }
    const { sy: syBreathe } = computeScale(0.0, cfg, 0.625)
    const { sy: syBase } = computeScale(0.0, cfg, 0)
    // syBreathe should differ from syBase (breathing at different phase)
    expect(syBreathe).not.toBeCloseTo(syBase, 4)
  })

  it('no breathing when amplitude >= 0.05', () => {
    const cfg: CatAnimConfig = { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['a'], breathe: 0.1 }
    const { sy: sy1 } = computeScale(0.1, cfg, 0)
    const { sy: sy2 } = computeScale(0.1, cfg, 100) // different time
    // Same amplitude → same result regardless of time
    expect(sy1).toBeCloseTo(sy2, 6)
  })
})

describe('nextFrame — mode: none', () => {
  const cfg: CatAnimConfig = { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['a', 'b'] }
  it('always returns 0', () => {
    expect(nextFrame(0, false, cfg, false)).toBe(0)
    expect(nextFrame(1, true, cfg, false)).toBe(0)
  })
})

describe('nextFrame — mode: momentary', () => {
  const cfg: CatAnimConfig = { squash: 0.1, axis: 'y', frameMode: 'momentary', frames: ['a', 'b'] }
  it('returns 1 while onset is true', () => {
    expect(nextFrame(0, true, cfg, false)).toBe(1)
    expect(nextFrame(0, true, cfg, true)).toBe(1)
  })
  it('returns 0 when onset is false', () => {
    expect(nextFrame(1, false, cfg, true)).toBe(0)
  })
})

describe('nextFrame — mode: latch', () => {
  const cfg: CatAnimConfig = { squash: 0.1, axis: 'y', frameMode: 'latch', frames: ['a', 'b', 'c'] }
  it('advances on leading edge of onset', () => {
    expect(nextFrame(0, true, cfg, false)).toBe(1) // onset rising edge
    expect(nextFrame(1, true, cfg, false)).toBe(2)
    expect(nextFrame(2, true, cfg, false)).toBe(0) // wraps around
  })
  it('holds frame when onset stays high', () => {
    expect(nextFrame(1, true, cfg, true)).toBe(1)
  })
  it('holds frame when onset is false', () => {
    expect(nextFrame(2, false, cfg, false)).toBe(2)
    expect(nextFrame(2, false, cfg, true)).toBe(2)
  })
})
