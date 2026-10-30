// Amplitude envelope computation — pure functions over Float32Array, no Web Audio deps

export interface Envelope {
  values: Float32Array
  hopSeconds: number
}

// Hop size: ~10 ms at 44100 Hz
const HOP_SAMPLES = 441

/** Compute RMS amplitude envelope for decoded audio channels. */
export function computeEnvelope(channels: Float32Array[], sampleRate: number): Envelope {
  const numSamples = channels[0].length
  const hopSamples = Math.round(sampleRate * 0.01) // ~10 ms
  const numFrames = Math.ceil(numSamples / hopSamples)
  const rms = new Float32Array(numFrames)

  // 1. RMS per hop window (mono-mix on the fly)
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSamples
    const end = Math.min(start + hopSamples, numSamples)
    let sum = 0
    const count = end - start
    for (let i = start; i < end; i++) {
      let mono = 0
      for (const ch of channels) mono += ch[i]
      mono /= channels.length
      sum += mono * mono
    }
    rms[f] = Math.sqrt(sum / count)
  }

  // 2. Normalize by 98th percentile
  const sorted = Float32Array.from(rms).sort()
  const p98 = sorted[Math.floor(numFrames * 0.98)] ?? sorted[sorted.length - 1] ?? 1
  const scale = p98 > 1e-9 ? 1 / p98 : 1
  for (let f = 0; f < numFrames; f++) rms[f] = Math.min(1, rms[f] * scale)

  // 3. Single-pole smoothing: attack ~10 ms, release ~120 ms
  const alphaAttack = 1 - Math.exp(-1 / ((sampleRate * 0.01) / hopSamples))
  const alphaRelease = 1 - Math.exp(-1 / ((sampleRate * 0.12) / hopSamples))
  const smooth = new Float32Array(numFrames)
  let prev = 0
  for (let f = 0; f < numFrames; f++) {
    const v = rms[f]
    const alpha = v > prev ? alphaAttack : alphaRelease
    prev = prev + alpha * (v - prev)
    smooth[f] = prev
  }

  return { values: smooth, hopSeconds: hopSamples / sampleRate }
}

/** Hysteresis onset detection on a normalized envelope. */
export function detectOnsets(values: Float32Array, on = 0.5, off = 0.3): Uint8Array {
  const out = new Uint8Array(values.length)
  let active = false
  for (let i = 0; i < values.length; i++) {
    if (!active && values[i] >= on) active = true
    else if (active && values[i] < off) active = false
    out[i] = active ? 1 : 0
  }
  return out
}

/** Sample envelope with linear interpolation. loopTime in seconds, returns 0..1. */
export function sampleEnvelope(env: Envelope, loopTime: number): number {
  const { values, hopSeconds } = env
  const pos = loopTime / hopSeconds
  const i = Math.floor(pos)
  const frac = pos - i
  const a = values[i % values.length] ?? 0
  const b = values[(i + 1) % values.length] ?? 0
  return Math.max(0, Math.min(1, a + frac * (b - a)))
}

// Export hop constant for tests
export { HOP_SAMPLES }
