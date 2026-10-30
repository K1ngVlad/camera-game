import { describe, it, expect } from 'vitest'
import { positionAt, createBeatDetector, trackTime } from './clock'
import type { MusicConfig, TrackTiming } from './clock'

const cfg: MusicConfig = { bpm: 120, beatsPerBar: 4, bars: 16 }
const SPB = 60 / 120 // 0.5 s per beat at 120 BPM
const LOOP = 16 * 4 * SPB // 32 s

describe('positionAt', () => {
  it('returns bar=0, beat=0 at t=0', () => {
    const p = positionAt(0, cfg)
    expect(p.bar).toBe(0)
    expect(p.beat).toBe(0)
    expect(p.beatPhase).toBeCloseTo(0, 5)
    expect(p.loopTime).toBeCloseTo(0, 5)
  })

  it('returns beat=1 at t=0.5 s', () => {
    const p = positionAt(SPB, cfg)
    expect(p.beat).toBe(1)
    expect(p.beatPhase).toBeCloseTo(0, 5)
  })

  it('returns bar=1, beat=0 at t=2 s (4 beats)', () => {
    const p = positionAt(4 * SPB, cfg)
    expect(p.bar).toBe(1)
    expect(p.beat).toBe(0)
  })

  it('wraps at loop boundary', () => {
    const p = positionAt(LOOP, cfg)
    expect(p.bar).toBe(0)
    expect(p.beat).toBe(0)
    expect(p.loopTime).toBeCloseTo(0, 3)
  })

  it('wraps correctly for elapsed >> loopDuration', () => {
    const p = positionAt(LOOP * 10 + SPB, cfg)
    expect(p.beat).toBe(1)
    expect(p.loopPhase).toBeGreaterThan(0)
  })

  it('returns correct beatPhase midway through a beat', () => {
    const p = positionAt(SPB * 0.5, cfg)
    expect(p.beatPhase).toBeCloseTo(0.5, 3)
  })

  it('loopPhase is 0..1 range', () => {
    for (let i = 0; i < 20; i++) {
      const p = positionAt(i * 1.7, cfg)
      expect(p.loopPhase).toBeGreaterThanOrEqual(0)
      expect(p.loopPhase).toBeLessThan(1)
    }
  })
})

describe('trackTime', () => {
  const BAR = (4 * 60) / 120  // 2 s per bar at 120 BPM 4/4

  it('full-file loop (loopStartBar=0): wraps at loopEnd', () => {
    const t: TrackTiming = { bpm: 120, beatsPerBar: 4, bars: 4, loopStartBar: 0, loopEndBar: 4 }
    expect(trackTime(0, t)).toBeCloseTo(0, 5)
    expect(trackTime(BAR * 2, t)).toBeCloseTo(BAR * 2, 5)
    // At exactly loopEnd → wraps to 0
    expect(trackTime(BAR * 4, t)).toBeCloseTo(0, 5)
    // Multiple loops
    expect(trackTime(BAR * 9, t)).toBeCloseTo(BAR * 1, 5)
  })

  it('intro (loopStartBar=2): plays intro once, then loops', () => {
    const t: TrackTiming = { bpm: 120, beatsPerBar: 4, bars: 8, loopStartBar: 2, loopEndBar: 8 }
    // During intro elapsed < introEnd
    expect(trackTime(0, t)).toBeCloseTo(0, 5)
    expect(trackTime(BAR, t)).toBeCloseTo(BAR, 5)
    // At loopStart = 2 bars
    expect(trackTime(BAR * 2, t)).toBeCloseTo(BAR * 2, 5)
    // One full loop past intro end
    expect(trackTime(BAR * 2 + BAR * 6, t)).toBeCloseTo(BAR * 2, 5)
    // Halfway through second loop
    expect(trackTime(BAR * 2 + BAR * 6 + BAR * 3, t)).toBeCloseTo(BAR * 2 + BAR * 3, 5)
  })

  it('handles elapsed just before loopEnd boundary', () => {
    const t: TrackTiming = { bpm: 120, beatsPerBar: 4, bars: 4 }
    const loopEnd = 4 * BAR
    expect(trackTime(loopEnd - 0.001, t)).toBeCloseTo(loopEnd - 0.001, 3)
    expect(trackTime(loopEnd + 0.001, t)).toBeCloseTo(0.001, 3)
  })

  it('defaults: loopStartBar=0, loopEndBar=bars', () => {
    const t: TrackTiming = { bpm: 120, beatsPerBar: 4, bars: 4 }
    expect(trackTime(0, t)).toBeCloseTo(0, 5)
    expect(trackTime(4 * BAR, t)).toBeCloseTo(0, 5)
  })
})

describe('createBeatDetector', () => {
  it('fires beat event when beat changes', () => {
    const det = createBeatDetector(cfg)
    // First call at beat 0 — may or may not fire depending on initial state
    // Advance to beat 1
    const r = det.update(SPB + 0.001)
    expect(r.beat).toBeDefined()
    expect(r.beat?.beat).toBe(1)
  })

  it('does not re-fire on same beat', () => {
    const det = createBeatDetector(cfg)
    det.update(SPB + 0.001)
    const r = det.update(SPB + 0.1)
    expect(r.beat).toBeUndefined()
  })

  it('fires bar event on beat 0 of each bar', () => {
    const det = createBeatDetector(cfg)
    // Start of bar 1 = 4 beats in
    const r = det.update(4 * SPB + 0.001)
    expect(r.bar).toBeDefined()
    expect(r.bar?.bar).toBe(1)
    expect(r.bar?.beat).toBe(0)
  })

  it('does not fire bar on beats 1, 2, 3', () => {
    const det = createBeatDetector(cfg)
    for (const beat of [1, 2, 3]) {
      const r2 = det.update(beat * SPB + 0.001)
      expect(r2.bar).toBeUndefined()
    }
  })

  it('fires only one beat event when multiple beats are skipped', () => {
    const det = createBeatDetector(cfg)
    // Jump 5 beats at once (simulating tab background)
    const r = det.update(5 * SPB + 0.001)
    expect(r.beat).toBeDefined()
    // Should only have one beat event, at beat 1 (beat index 5)
  })

  it('fires on loop wrap-around', () => {
    const det = createBeatDetector(cfg)
    // Get to just before the end
    det.update(LOOP - 0.01)
    // Cross the boundary
    const r = det.update(LOOP + 0.001)
    expect(r.beat).toBeDefined()
    expect(r.bar).toBeDefined()
    expect(r.beat?.bar).toBe(0)
    expect(r.beat?.beat).toBe(0)
  })
})
