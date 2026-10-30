import { describe, it, expect } from 'vitest'
import { computeCamTiming } from './AudioEngine'

describe('computeCamTiming', () => {
  it('computes 4 bars from 8s at 120 BPM 4/4', () => {
    const { timing, mismatch, computedBars } = computeCamTiming(8)
    expect(computedBars).toBe(4)
    expect(timing.bars).toBe(4)
    expect(timing.bpm).toBe(120)
    expect(timing.beatsPerBar).toBe(4)
    expect(timing.loopStartBar).toBe(0)
    expect(timing.loopEndBar).toBe(4)
    expect(mismatch).toBe(false)
  })

  it('computes 8 bars from 16s at 120 BPM 4/4', () => {
    const { timing, mismatch, computedBars } = computeCamTiming(16)
    expect(computedBars).toBe(8)
    expect(timing.bars).toBe(8)
    expect(mismatch).toBe(false)
  })

  it('detects mismatch when duration is more than 30ms off a bar boundary', () => {
    // 8.05s vs exactly 8.0s (4 bars) — 50ms off, should warn
    const { computedBars, mismatch } = computeCamTiming(8.05)
    expect(computedBars).toBe(4)
    expect(mismatch).toBe(true)
  })

  it('accepts small jitter within 30ms tolerance', () => {
    // 8.02s — only 20ms off, no warn
    const { mismatch } = computeCamTiming(8.02)
    expect(mismatch).toBe(false)
  })

  it('uses override bars over computed bars', () => {
    const { timing } = computeCamTiming(16, { bars: 4 })
    expect(timing.bars).toBe(4) // forced to 4 despite 8 being natural
  })

  it('respects override BPM', () => {
    // 4s at 120 BPM = 2 bars; at 60 BPM = 1 bar
    const { computedBars } = computeCamTiming(4, { bpm: 60 })
    expect(computedBars).toBe(1)
  })

  it('uses override loopEndBar', () => {
    const { timing } = computeCamTiming(8, { loopEndBar: 2 })
    expect(timing.loopEndBar).toBe(2)
  })

  it('defaults loopEndBar to computed bars', () => {
    const { timing } = computeCamTiming(16)
    expect(timing.loopEndBar).toBe(8)
  })
})
