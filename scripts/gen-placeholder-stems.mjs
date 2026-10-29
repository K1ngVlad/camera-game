// Placeholder stem generator — pure Node.js, no dependencies
// 120 BPM, 4/4, 16 bars = 32.000 s, WAV mono 16-bit 44100 Hz, 1,411,200 samples

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'audio', 'placeholder')

mkdirSync(OUT_DIR, { recursive: true })

const SR = 44100
const BPM = 120
const BEATS_PER_BAR = 4
const BARS = 16
const TOTAL_BEATS = BARS * BEATS_PER_BAR
const SPB = SR * 60 / BPM          // samples per beat = 22050
const SPBAR = SPB * BEATS_PER_BAR  // samples per bar = 88200
const N = TOTAL_BEATS * SPB        // total samples = 1,411,200
const TARGET_PEAK = 0.7079         // -3 dBFS

// ── helpers ─────────────────────────────────────────────────────────────────

function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return s / 0xFFFFFFFF
  }
}

function env(t, attack, decay) {
  if (t < 0) return 0
  if (t < attack) return t / attack
  const d = t - attack
  return Math.exp(-d / decay)
}

function writeWav(samples, filename) {
  const buf = Buffer.allocUnsafe(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)        // PCM
  buf.writeUInt16LE(1, 22)        // mono
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)   // byte rate
  buf.writeUInt16LE(2, 32)        // block align
  buf.writeUInt16LE(16, 34)       // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(join(OUT_DIR, filename), buf)
  console.log(`  wrote ${filename}  (${samples.length} samples)`)
}

function normalize(buf, target = TARGET_PEAK) {
  let peak = 0
  for (let i = 0; i < buf.length; i++) if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i])
  if (peak < 1e-9) return buf
  const gain = target / peak
  for (let i = 0; i < buf.length; i++) buf[i] *= gain
  return buf
}

// Fade last 50 ms to eliminate loop seam click
function fadeLoopEnd(buf) {
  const fade = Math.round(0.05 * SR)
  for (let i = 0; i < fade; i++) buf[buf.length - 1 - i] *= i / fade
  return buf
}

// ── drums ────────────────────────────────────────────────────────────────────
// Kick on each beat: sine sweep 150→50 Hz, 120 ms
// Hi-hat on offbeats (8th-note subdivisions, the ones between beats): noise, 60 ms

function genDrums() {
  const buf = new Float32Array(N)
  for (let beat = 0; beat < TOTAL_BEATS; beat++) {
    const t0 = beat * SPB
    // kick
    for (let s = 0; s < Math.round(0.25 * SR); s++) {
      const t = s / SR
      const freq = 150 * Math.pow(50 / 150, t / 0.12)
      const phase = 2 * Math.PI * freq * t
      const amp = env(t, 0.002, 0.04) * 0.9
      const si = t0 + s
      if (si < N) buf[si] += Math.sin(phase) * amp
    }
    // hi-hat at offbeat (half-beat later)
    const t1 = t0 + Math.round(SPB * 0.5)
    for (let s = 0; s < Math.round(0.06 * SR); s++) {
      const t = s / SR
      const noise = (Math.random() * 2 - 1)
      const amp = env(t, 0.001, 0.02) * 0.35
      const si = t1 + s
      if (si < N) buf[si] += noise * amp
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── bass ─────────────────────────────────────────────────────────────────────
// Sawtooth 8th-note offbeats, notes A1/C2/D2/E2 cycle per bar, simple LP

function genBass() {
  const buf = new Float32Array(N)
  const notes = [55.00, 65.41, 73.42, 82.41] // A1, C2, D2, E2
  let phase = 0
  const lpAlpha = 0.15

  for (let bar = 0; bar < BARS; bar++) {
    const freq = notes[bar % notes.length]
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      // offbeat 8th = half beat into each beat
      const t0 = (bar * BEATS_PER_BAR + beat) * SPB + Math.round(SPB * 0.5)
      const dur = Math.round(SPB * 0.45) // just under half beat
      let lp = 0
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        phase += freq / SR
        const saw = 2 * (phase % 1) - 1
        lp = lp + lpAlpha * (saw - lp)
        const amp = env(t, 0.005, 0.12) * 0.8
        const si = t0 + s
        if (si < N) buf[si] += lp * amp
      }
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── keys ─────────────────────────────────────────────────────────────────────
// Chord stabs on beats 2 & 4, 3-sine chord, cycle Am/C/Dm/Em per bar

function genKeys() {
  const buf = new Float32Array(N)
  // Am, C, Dm, Em — root/third/fifth in Hz
  const chords = [
    [220.00, 261.63, 329.63], // Am: A3, C4, E4
    [261.63, 329.63, 392.00], // C:  C4, E4, G4
    [293.66, 349.23, 440.00], // Dm: D4, F4, A4
    [329.63, 392.00, 493.88], // Em: E4, G4, B4
  ]
  for (let bar = 0; bar < BARS; bar++) {
    const freqs = chords[bar % chords.length]
    for (const beatOffset of [1, 3]) { // beats 2 and 4 (0-indexed)
      const t0 = (bar * BEATS_PER_BAR + beatOffset) * SPB
      const dur = Math.round(SPB * 0.9)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        let v = 0
        for (const f of freqs) v += Math.sin(2 * Math.PI * f * t)
        v /= freqs.length
        const amp = env(t, 0.01, 0.15) * 0.7
        const si = t0 + s
        if (si < N) buf[si] += v * amp
      }
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── pumpkin ───────────────────────────────────────────────────────────────────
// Low organ (D2 + D3), whole-bar envelope, every 2 bars

function genPumpkin() {
  const buf = new Float32Array(N)
  const f1 = 73.42, f2 = 146.83 // D2, D3
  for (let bar = 0; bar < BARS; bar += 2) {
    const t0 = bar * SPBAR
    const dur = SPBAR
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const v = Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4
      const barPhase = s / dur
      // Smooth on/off envelope over the whole bar
      const amp = Math.sin(Math.PI * barPhase) * 0.85
      const si = t0 + s
      if (si < N) buf[si] += v * amp
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── choir ─────────────────────────────────────────────────────────────────────
// Soft "aa" sine + vibrato (5 Hz), notes from chord, half notes (2 beats each)

function genChoir() {
  const buf = new Float32Array(N)
  // Chord root notes (A3, C4, D4, E4) for half-note pattern
  const noteFreqs = [220.00, 261.63, 293.66, 329.63]
  const vibRate = 5, vibDepth = 0.012
  const halfNoteSamples = SPB * 2

  for (let i = 0; i < TOTAL_BEATS / 2; i++) {
    const freq = noteFreqs[i % noteFreqs.length]
    const t0 = i * halfNoteSamples
    const dur = Math.round(halfNoteSamples * 0.92)
    let phase = 0
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const vib = 1 + vibDepth * Math.sin(2 * Math.PI * vibRate * t)
      phase += freq * vib / SR
      const v = Math.sin(2 * Math.PI * phase)
      // soft attack + release
      const barPhase = s / dur
      const amp = Math.sin(Math.PI * barPhase) * 0.65
      const si = t0 + s
      if (si < N) buf[si] += v * amp
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── trumpet ───────────────────────────────────────────────────────────────────
// 4-note phrase, 1 bar, every 2 bars (bars 0, 2, 4...)

function genTrumpet() {
  const buf = new Float32Array(N)
  const phrase = [392.00, 440.00, 392.00, 329.63] // G4, A4, G4, E4
  for (let bar = 0; bar < BARS; bar += 2) {
    for (let beat = 0; beat < 4; beat++) {
      const freq = phrase[beat]
      const t0 = (bar * BEATS_PER_BAR + beat) * SPB
      const dur = Math.round(SPB * 0.85) // staccato
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        // slight brightness: fundamental + 2nd harmonic
        const v = Math.sin(2 * Math.PI * freq * t) * 0.7
              + Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
        const amp = env(t, 0.015, 0.2) * 0.75
        const si = t0 + s
        if (si < N) buf[si] += v * amp
      }
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── pop ───────────────────────────────────────────────────────────────────────
// Short sine bursts at pseudo-random 16th positions, seeded PRNG

function genPop() {
  const buf = new Float32Array(N)
  const SIXTEENTH = Math.round(SPB * 0.5) // 16th note = half beat at 4/4
  const totalSixteenths = TOTAL_BEATS * 2
  const rand = seededRand(0xC47C0FF3)
  const popFreq = 880

  for (let s16 = 0; s16 < totalSixteenths; s16++) {
    if (rand() < 0.4) { // ~40% density
      const t0 = s16 * SIXTEENTH
      const dur = Math.round(0.04 * SR) // 40 ms
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        const v = Math.sin(2 * Math.PI * popFreq * t)
        const amp = env(t, 0.002, 0.015) * 0.8
        const si = t0 + s
        if (si < N) buf[si] += v * amp
      }
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── bongo ─────────────────────────────────────────────────────────────────────
// Alternating 300/200 Hz sine, 8th notes

function genBongo() {
  const buf = new Float32Array(N)
  const freqs = [300, 200]
  let idx = 0
  const EIGHTH = Math.round(SPB * 0.5)
  const totalEighths = TOTAL_BEATS * 2

  for (let e = 0; e < totalEighths; e++) {
    const freq = freqs[idx % 2]
    idx++
    const t0 = e * EIGHTH
    const dur = Math.round(0.08 * SR) // 80 ms
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const v = Math.sin(2 * Math.PI * freq * t)
      const amp = env(t, 0.002, 0.025) * 0.85
      const si = t0 + s
      if (si < N) buf[si] += v * amp
    }
  }
  return fadeLoopEnd(normalize(buf))
}

// ── horn SFX ──────────────────────────────────────────────────────────────────
// Two square-wave tones, 0.4 s total

function genHorn() {
  const dur = Math.round(0.4 * SR)
  const buf = new Float32Array(dur)
  const f1 = 440, f2 = 550
  const half = Math.round(dur / 2)

  for (let s = 0; s < half; s++) {
    const v = Math.sign(Math.sin(2 * Math.PI * f1 * s / SR)) * 0.5
    const t = s / SR
    buf[s] += v * env(t, 0.005, 0.1)
  }
  for (let s = 0; s < half; s++) {
    const v = Math.sign(Math.sin(2 * Math.PI * f2 * s / SR)) * 0.5
    const t = s / SR
    const si = half + s
    // fade out at end
    const fadeOut = s > half - Math.round(0.02 * SR) ? (half - s) / (0.02 * SR) : 1
    buf[si] += v * env(t, 0.005, 0.1) * fadeOut
  }
  return normalize(buf, 0.7)
}

// ── generate all ─────────────────────────────────────────────────────────────

console.log(`Generating placeholder stems → ${OUT_DIR}\n`)

const stems = [
  ['drums.wav',   genDrums],
  ['bass.wav',    genBass],
  ['keys.wav',    genKeys],
  ['pumpkin.wav', genPumpkin],
  ['choir.wav',   genChoir],
  ['trumpet.wav', genTrumpet],
  ['pop.wav',     genPop],
  ['bongo.wav',   genBongo],
  ['horn.wav',    genHorn],
]

for (const [filename, gen] of stems) {
  process.stdout.write(`  generating ${filename}...`)
  const buf = gen()
  process.stdout.write('\r')
  writeWav(buf, filename)
}

console.log('\nDone. All stems: 1,411,200 samples each (32.000 s).')
console.log('horn.wav: short SFX, 0.4 s.')
