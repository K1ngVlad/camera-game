// Placeholder stem generator — pure Node.js, no dependencies
// 120 BPM, 4/4 — camera loops: 4 bars (8 s), song stems: 34 bars (68 s)

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLACEHOLDER_DIR = join(__dirname, '..', 'public', 'assets', 'audio', 'placeholder')

const SR = 44100
const BPM = 120
const BEATS_PER_BAR = 4
const SPB = (SR * 60) / BPM          // 22050 samples per beat
const SPBAR = SPB * BEATS_PER_BAR    // 88200 samples per bar
const TARGET_PEAK = 0.7079           // -3 dBFS

const CAM_BARS = 4
const SONG_BARS = 34
const CAM_N = CAM_BARS * SPBAR       // 352800 ≈ 8 s
const SONG_N = SONG_BARS * SPBAR     // 2998800 ≈ 68 s

const CAT_IDS = ['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir', 'trumpet', 'popcat', 'bongo']

// ── helpers ──────────────────────────────────────────────────────────────────

function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function env(t, attack, decay) {
  if (t < 0) return 0
  if (t < attack) return t / attack
  return Math.exp(-(t - attack) / decay)
}

function normalize(buf, target = TARGET_PEAK) {
  let peak = 0
  for (let i = 0; i < buf.length; i++) if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i])
  if (peak < 1e-9) return buf
  const gain = target / peak
  for (let i = 0; i < buf.length; i++) buf[i] *= gain
  return buf
}

function withFade(buf, fadeBars = 1) {
  const fadeSamples = fadeBars * SPBAR
  for (let i = 0; i < fadeSamples && i < buf.length; i++) {
    buf[buf.length - 1 - i] *= i / fadeSamples
  }
  return buf
}

function writeWav(samples, filepath) {
  const buf = Buffer.allocUnsafe(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)       // PCM
  buf.writeUInt16LE(1, 22)       // mono
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)  // byte rate
  buf.writeUInt16LE(2, 32)       // block align
  buf.writeUInt16LE(16, 34)      // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(filepath, buf)
  const name = filepath.replace(/\\/g, '/').split('/').pop()
  console.log(`  wrote ${name}  (${(samples.length / SR).toFixed(2)} s)`)
}

// ── camera loops (4 bars each) ───────────────────────────────────────────────

function camDrummer() {
  const buf = new Float32Array(CAM_N)
  for (let beat = 0; beat < CAM_BARS * BEATS_PER_BAR; beat++) {
    const t0 = beat * SPB
    for (let s = 0; s < Math.round(0.25 * SR); s++) {
      const t = s / SR
      const freq = 150 * Math.pow(50 / 150, t / 0.12)
      const si = t0 + s
      if (si < CAM_N) buf[si] += Math.sin(2 * Math.PI * freq * t) * env(t, 0.002, 0.04) * 0.9
    }
    const t1 = t0 + Math.round(SPB * 0.5)
    for (let s = 0; s < Math.round(0.06 * SR); s++) {
      const t = s / SR
      const si = t1 + s
      if (si < CAM_N) buf[si] += (Math.random() * 2 - 1) * env(t, 0.001, 0.02) * 0.35
    }
  }
  return normalize(buf)
}

function camLongcat() {
  const buf = new Float32Array(CAM_N)
  const notes = [55.0, 65.41, 73.42, 82.41]
  let phase = 0, lp = 0
  const lpAlpha = 0.15
  for (let beat = 0; beat < CAM_BARS * BEATS_PER_BAR; beat++) {
    const freq = notes[Math.floor(beat / 2) % notes.length]
    const t0 = beat * SPB
    const dur = Math.round(SPB * 0.9)
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      phase += freq / SR
      const saw = 2 * (phase % 1) - 1
      lp = lp + lpAlpha * (saw - lp)
      const si = t0 + s
      if (si < CAM_N) buf[si] += lp * env(t, 0.005, 0.2) * 0.8
    }
  }
  return normalize(buf)
}

function camKeyboard() {
  const buf = new Float32Array(CAM_N)
  const chords = [
    [220.0, 261.63, 329.63],
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
  ]
  for (let bar = 0; bar < CAM_BARS; bar++) {
    const freqs = chords[bar % chords.length]
    for (const beatOff of [1, 3]) {
      const t0 = (bar * BEATS_PER_BAR + beatOff) * SPB
      const dur = Math.round(SPB * 0.9)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        let v = 0
        for (const f of freqs) v += Math.sin(2 * Math.PI * f * t)
        const si = t0 + s
        if (si < CAM_N) buf[si] += (v / freqs.length) * env(t, 0.01, 0.15) * 0.7
      }
    }
  }
  return normalize(buf)
}

function camPumpkin() {
  const buf = new Float32Array(CAM_N)
  const f1 = 73.42, f2 = 146.83
  for (let s = 0; s < CAM_N; s++) {
    const t = s / SR
    const v = Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4
    buf[s] = v * Math.sin(Math.PI * ((s % SPBAR) / SPBAR)) * 0.85
  }
  return normalize(buf)
}

function camChoir() {
  const buf = new Float32Array(CAM_N)
  const freqs = [220.0, 261.63, 293.66, 329.63]
  const halfNote = SPB * 2
  for (let i = 0; i < Math.floor(CAM_N / halfNote); i++) {
    const freq = freqs[i % freqs.length]
    const t0 = i * halfNote
    const dur = Math.round(halfNote * 0.92)
    let phase = 0
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5 * t)
      phase += (freq * vib) / SR
      const si = t0 + s
      if (si < CAM_N) buf[si] += Math.sin(2 * Math.PI * phase) * Math.sin(Math.PI * (s / dur)) * 0.65
    }
  }
  return normalize(buf)
}

function camTrumpet() {
  // phrase plays 1 bar, then 1 bar silence — repeat
  const buf = new Float32Array(CAM_N)
  const phrase = [392.0, 440.0, 392.0, 329.63]
  for (let bar = 0; bar < CAM_BARS; bar += 2) {
    for (let beat = 0; beat < 4; beat++) {
      const freq = phrase[beat]
      const t0 = (bar * BEATS_PER_BAR + beat) * SPB
      const dur = Math.round(SPB * 0.85)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        const v =
          Math.sin(2 * Math.PI * freq * t) * 0.7 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
        const si = t0 + s
        if (si < CAM_N) buf[si] += v * env(t, 0.015, 0.2) * 0.75
      }
    }
  }
  return normalize(buf)
}

function camPopcat() {
  // "Snore": slow noisy inhale-exhale cycle ~0.8 Hz
  const buf = new Float32Array(CAM_N)
  const snorePeriod = Math.round(SR * 1.25)
  const rng = seededRand(0xdeadbeef)
  let lp = 0
  const lpAlpha = 0.02
  for (let s = 0; s < CAM_N; s++) {
    const breathEnv = Math.sin(Math.PI * ((s % snorePeriod) / snorePeriod))
    lp = lp + lpAlpha * (rng() * 2 - 1 - lp)
    buf[s] = lp * breathEnv * 0.9
  }
  return normalize(buf)
}

function camBongo() {
  const buf = new Float32Array(CAM_N)
  const freqs = [300, 200]
  const eighth = Math.round(SPB * 0.5)
  for (let e = 0; e < CAM_BARS * BEATS_PER_BAR * 2; e++) {
    const freq = freqs[e % 2]
    const t0 = e * eighth
    const dur = Math.round(0.08 * SR)
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const si = t0 + s
      if (si < CAM_N) buf[si] += Math.sin(2 * Math.PI * freq * t) * env(t, 0.002, 0.025) * 0.85
    }
  }
  return normalize(buf)
}

// ── song stems (34 bars, last bar fades out) ─────────────────────────────────

function songDrummer() {
  const buf = new Float32Array(SONG_N)
  for (let beat = 0; beat < SONG_BARS * BEATS_PER_BAR; beat++) {
    const t0 = beat * SPB
    for (let s = 0; s < Math.round(0.25 * SR); s++) {
      const t = s / SR
      const freq = 150 * Math.pow(50 / 150, t / 0.12)
      const si = t0 + s
      if (si < SONG_N) buf[si] += Math.sin(2 * Math.PI * freq * t) * env(t, 0.002, 0.04) * 0.9
    }
    const t1 = t0 + Math.round(SPB * 0.5)
    for (let s = 0; s < Math.round(0.06 * SR); s++) {
      const t = s / SR
      const si = t1 + s
      if (si < SONG_N) buf[si] += (Math.random() * 2 - 1) * env(t, 0.001, 0.02) * 0.35
    }
  }
  return withFade(normalize(buf))
}

function songLongcat() {
  const buf = new Float32Array(SONG_N)
  const notes = [55.0, 65.41, 73.42, 82.41, 87.31, 73.42, 65.41, 55.0]
  let phase = 0, lp = 0
  const lpAlpha = 0.15
  for (let beat = 0; beat < SONG_BARS * BEATS_PER_BAR; beat++) {
    const freq = notes[Math.floor(beat / 2) % notes.length]
    const t0 = beat * SPB + Math.round(SPB * 0.5)
    const dur = Math.round(SPB * 0.45)
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      phase += freq / SR
      const saw = 2 * (phase % 1) - 1
      lp = lp + lpAlpha * (saw - lp)
      const si = t0 + s
      if (si < SONG_N) buf[si] += lp * env(t, 0.005, 0.12) * 0.8
    }
  }
  return withFade(normalize(buf))
}

function songKeyboard() {
  const buf = new Float32Array(SONG_N)
  const chords = [
    [220.0, 261.63, 329.63],
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
  ]
  for (let bar = 0; bar < SONG_BARS; bar++) {
    const freqs = chords[bar % chords.length]
    for (const beatOff of [1, 3]) {
      const t0 = (bar * BEATS_PER_BAR + beatOff) * SPB
      const dur = Math.round(SPB * 0.9)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        let v = 0
        for (const f of freqs) v += Math.sin(2 * Math.PI * f * t)
        const si = t0 + s
        if (si < SONG_N) buf[si] += (v / freqs.length) * env(t, 0.01, 0.15) * 0.7
      }
    }
  }
  return withFade(normalize(buf))
}

function songPumpkin() {
  const buf = new Float32Array(SONG_N)
  const f1 = 73.42, f2 = 146.83
  for (let bar = 0; bar < SONG_BARS; bar += 2) {
    const t0 = bar * SPBAR
    for (let s = 0; s < SPBAR; s++) {
      const t = s / SR
      const v = Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4
      const si = t0 + s
      if (si < SONG_N) buf[si] += v * Math.sin(Math.PI * (s / SPBAR)) * 0.85
    }
  }
  return withFade(normalize(buf))
}

function songChoir() {
  const buf = new Float32Array(SONG_N)
  const freqs = [220.0, 261.63, 293.66, 329.63, 349.23, 392.0]
  const halfNote = SPB * 2
  for (let i = 0; i < Math.floor(SONG_N / halfNote); i++) {
    const freq = freqs[i % freqs.length]
    const t0 = i * halfNote
    const dur = Math.round(halfNote * 0.92)
    let phase = 0
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5 * t)
      phase += (freq * vib) / SR
      const si = t0 + s
      if (si < SONG_N) buf[si] += Math.sin(2 * Math.PI * phase) * Math.sin(Math.PI * (s / dur)) * 0.65
    }
  }
  return withFade(normalize(buf))
}

function songTrumpet() {
  const buf = new Float32Array(SONG_N)
  const phrase = [392.0, 440.0, 392.0, 329.63]
  for (let bar = 0; bar < SONG_BARS; bar += 2) {
    for (let beat = 0; beat < 4; beat++) {
      const freq = phrase[beat]
      const t0 = (bar * BEATS_PER_BAR + beat) * SPB
      const dur = Math.round(SPB * 0.85)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        const v =
          Math.sin(2 * Math.PI * freq * t) * 0.7 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
        const si = t0 + s
        if (si < SONG_N) buf[si] += v * env(t, 0.015, 0.2) * 0.75
      }
    }
  }
  return withFade(normalize(buf))
}

function songPopcat() {
  const buf = new Float32Array(SONG_N)
  const eighth = Math.round(SPB * 0.5)
  const totalSixteenths = SONG_BARS * BEATS_PER_BAR * 2
  const rand = seededRand(0xc47c0ff3)
  const popFreq = 880
  for (let s16 = 0; s16 < totalSixteenths; s16++) {
    if (rand() < 0.4) {
      const t0 = s16 * eighth
      const dur = Math.round(0.04 * SR)
      for (let s = 0; s < dur; s++) {
        const t = s / SR
        const si = t0 + s
        if (si < SONG_N) buf[si] += Math.sin(2 * Math.PI * popFreq * t) * env(t, 0.002, 0.015) * 0.8
      }
    }
  }
  return withFade(normalize(buf))
}

function songBongo() {
  const buf = new Float32Array(SONG_N)
  const freqs = [300, 200]
  const eighth = Math.round(SPB * 0.5)
  for (let e = 0; e < SONG_BARS * BEATS_PER_BAR * 2; e++) {
    const freq = freqs[e % 2]
    const t0 = e * eighth
    const dur = Math.round(0.08 * SR)
    for (let s = 0; s < dur; s++) {
      const t = s / SR
      const si = t0 + s
      if (si < SONG_N) buf[si] += Math.sin(2 * Math.PI * freq * t) * env(t, 0.002, 0.025) * 0.85
    }
  }
  return withFade(normalize(buf))
}

// ── SFX ──────────────────────────────────────────────────────────────────────

function sfxHorn() {
  const dur = Math.round(0.4 * SR)
  const buf = new Float32Array(dur)
  const half = Math.round(dur / 2)
  for (let s = 0; s < half; s++) {
    buf[s] += Math.sign(Math.sin(2 * Math.PI * 440 * (s / SR))) * 0.5 * env(s / SR, 0.005, 0.1)
  }
  for (let s = 0; s < half; s++) {
    const fade = s > half - Math.round(0.02 * SR) ? (half - s) / (0.02 * SR) : 1
    buf[half + s] +=
      Math.sign(Math.sin(2 * Math.PI * 550 * (s / SR))) * 0.5 * env(s / SR, 0.005, 0.1) * fade
  }
  return normalize(buf, 0.7)
}

function sfxFound() {
  // Short major arpeggio C4-E4-G4-C5
  const notes = [261.63, 329.63, 392.0, 523.25]
  const noteDur = Math.round(0.12 * SR)
  const total = Math.round(0.6 * SR)
  const buf = new Float32Array(total)
  for (let i = 0; i < notes.length; i++) {
    const freq = notes[i]
    const t0 = i * noteDur
    for (let s = 0; s < noteDur && t0 + s < total; s++) {
      const t = s / SR
      const v =
        Math.sin(2 * Math.PI * freq * t) * 0.7 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
      buf[t0 + s] += v * env(t, 0.005, 0.08)
    }
  }
  return normalize(buf, 0.7)
}

// ── run ───────────────────────────────────────────────────────────────────────

const camDir = join(PLACEHOLDER_DIR, 'camera')
const songDir = join(PLACEHOLDER_DIR, 'song')
const sfxDir = join(PLACEHOLDER_DIR, 'sfx')
mkdirSync(camDir, { recursive: true })
mkdirSync(songDir, { recursive: true })
mkdirSync(sfxDir, { recursive: true })

const camGens = {
  drummer: camDrummer, longcat: camLongcat, keyboard: camKeyboard, pumpkin: camPumpkin,
  choir: camChoir, trumpet: camTrumpet, popcat: camPopcat, bongo: camBongo,
}
const songGens = {
  drummer: songDrummer, longcat: songLongcat, keyboard: songKeyboard, pumpkin: songPumpkin,
  choir: songChoir, trumpet: songTrumpet, popcat: songPopcat, bongo: songBongo,
}

console.log(`\nGenerating camera loops (${CAM_BARS} bars = ${(CAM_N / SR).toFixed(1)} s each)...`)
for (const id of CAT_IDS) {
  process.stdout.write(`  ${id}...`)
  process.stdout.write('\r')
  writeWav(camGens[id](), join(camDir, `${id}.wav`))
}

console.log(`\nGenerating song stems (${SONG_BARS} bars = ${(SONG_N / SR).toFixed(1)} s each)...`)
for (const id of CAT_IDS) {
  process.stdout.write(`  ${id}...`)
  process.stdout.write('\r')
  writeWav(songGens[id](), join(songDir, `${id}.wav`))
}

console.log('\nGenerating SFX...')
writeWav(sfxHorn(), join(sfxDir, 'horn.wav'))
writeWav(sfxFound(), join(sfxDir, 'found.wav'))

console.log('\nDone.')
