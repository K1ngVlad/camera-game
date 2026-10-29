import { describe, it, expect } from 'vitest'
import { computeEnvelope, detectOnsets, sampleEnvelope } from './envelope'

const SR = 44100

function makeSilence(n: number): Float32Array[] {
  return [new Float32Array(n)]
}

function makeSine(freq: number, amplitude: number, n: number): Float32Array[] {
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i++) ch[i] = amplitude * Math.sin(2 * Math.PI * freq * i / SR)
  return [ch]
}

function makeImpulses(periodSec: number, durationSec: number): Float32Array[] {
  const n = Math.round(durationSec * SR)
  const period = Math.round(periodSec * SR)
  const ch = new Float32Array(n)
  for (let i = 0; i < n; i += period) {
    // impulse burst: 20 ms of 1.0
    const burstLen = Math.round(0.02 * SR)
    for (let j = 0; j < burstLen && i + j < n; j++) ch[i + j] = 1.0
  }
  return [ch]
}

describe('computeEnvelope', () => {
  it('returns all zeros for silence', () => {
    const env = computeEnvelope(makeSilence(SR), SR)
    const allZero = Array.from(env.values).every(v => v < 1e-6)
    expect(allZero).toBe(true)
  })

  it('returns ~1 for constant-amplitude sine after normalization', () => {
    // 1 second of a 440 Hz sine at amplitude 0.8
    const env = computeEnvelope(makeSine(440, 0.8, SR), SR)
    // After normalization, steady signal should be close to 1
    // Skip first few frames (transient attack)
    const midValues = Array.from(env.values).slice(5, env.values.length - 5)
    const avg = midValues.reduce((a, b) => a + b, 0) / midValues.length
    expect(avg).toBeGreaterThan(0.7)
    expect(avg).toBeLessThanOrEqual(1.01)
  })

  it('hopSeconds is ~10 ms', () => {
    const env = computeEnvelope(makeSilence(SR), SR)
    expect(env.hopSeconds).toBeCloseTo(0.01, 3)
  })
})

describe('detectOnsets', () => {
  it('returns all zeros for silence envelope', () => {
    const values = new Float32Array(100)
    const onsets = detectOnsets(values)
    expect(Array.from(onsets).every(v => v === 0)).toBe(true)
  })

  it('marks onsets for impulse bursts every 0.5 s', () => {
    const totalSec = 4
    const env = computeEnvelope(makeImpulses(0.5, totalSec), SR)
    const onsets = detectOnsets(env.values)
    // Count distinct onset windows (rising edges)
    let risingEdges = 0
    for (let i = 1; i < onsets.length; i++) {
      if (onsets[i] === 1 && onsets[i - 1] === 0) risingEdges++
    }
    // 4 seconds / 0.5 s = 8 impulses; allow ±1
    expect(risingEdges).toBeGreaterThanOrEqual(6)
    expect(risingEdges).toBeLessThanOrEqual(9)
  })

  it('does not oscillate (hysteresis) on signal near threshold', () => {
    // Signal hovering just at 0.4 (between on=0.5 and off=0.3) — never triggers
    const values = new Float32Array(200).fill(0.4)
    const onsets = detectOnsets(values)
    expect(Array.from(onsets).every(v => v === 0)).toBe(true)
  })

  it('latches on once above threshold and stays on until below off', () => {
    const values = new Float32Array([0, 0, 0.6, 0.6, 0.35, 0.35, 0.2, 0.2])
    const onsets = detectOnsets(values)
    // 0, 0 → off; 0.6, 0.6 → on (crosses 0.5); 0.35 → stays on (above 0.3); 0.2 → off
    expect(onsets[0]).toBe(0)
    expect(onsets[1]).toBe(0)
    expect(onsets[2]).toBe(1)
    expect(onsets[3]).toBe(1)
    expect(onsets[4]).toBe(1) // still above 0.3
    expect(onsets[5]).toBe(1)
    expect(onsets[6]).toBe(0) // below 0.3
    expect(onsets[7]).toBe(0)
  })
})

describe('sampleEnvelope', () => {
  it('returns 0 for empty/silent envelope at t=0', () => {
    const env = computeEnvelope(makeSilence(SR), SR)
    expect(sampleEnvelope(env, 0)).toBeCloseTo(0, 5)
  })

  it('linearly interpolates between frames', () => {
    // Build a simple envelope with known values
    const values = new Float32Array([0, 1, 0])
    const env = { values, hopSeconds: 0.1 }
    // At t=0.1 (frame 1) → 1.0
    expect(sampleEnvelope(env, 0.1)).toBeCloseTo(1.0, 5)
    // At t=0.05 (midpoint between frame 0 and 1) → ~0.5
    expect(sampleEnvelope(env, 0.05)).toBeCloseTo(0.5, 5)
  })

  it('clamps output to 0..1', () => {
    const values = new Float32Array([2.0, -1.0])
    const env = { values, hopSeconds: 0.1 }
    expect(sampleEnvelope(env, 0)).toBeLessThanOrEqual(1)
    expect(sampleEnvelope(env, 0.1)).toBeGreaterThanOrEqual(0)
  })
})
