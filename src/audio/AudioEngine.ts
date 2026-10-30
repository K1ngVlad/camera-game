import { computeEnvelope, detectOnsets, sampleEnvelope } from './envelope'
import type { Envelope } from './envelope'
import { trackTime, trackPosition, createBeatDetector } from './clock'
import type { MusicPosition, TrackTiming } from './clock'
import type { CatId } from '../data/cats'
import { SONG_TIMING, CAMERA_TIMING } from '../data/music'

export type TrackId = string  // 'cam:<catId>', 'song:<catId>'

export interface AudioReportEntry {
  catId: CatId
  kind: 'cam' | 'song'
  duration: number
  bars: number
  channels: number
  silent: boolean
  lengthOk?: boolean // only for song stems
}
export interface AudioReport {
  cats: AudioReportEntry[]
  totalMB: number
}

/** Pure helper: compute camera loop TrackTiming from buffer duration + optional overrides. */
export function computeCamTiming(
  duration: number,
  override: Partial<TrackTiming> = {},
): { timing: TrackTiming; mismatch: boolean; computedBars: number } {
  const bpm = override.bpm ?? 120
  const beatsPerBar = override.beatsPerBar ?? 4
  const secondsPerBar = (beatsPerBar * 60) / bpm
  const computedBars = Math.round(duration / secondsPerBar)
  const bars = override.bars ?? computedBars
  const mismatch = Math.abs(duration - computedBars * secondsPerBar) > 0.03
  return {
    timing: {
      bpm,
      beatsPerBar,
      bars,
      loopStartBar: override.loopStartBar ?? 0,
      loopEndBar: override.loopEndBar ?? bars,
    },
    mismatch,
    computedBars,
  }
}

export interface AudioManifest {
  camera: Partial<Record<CatId, string>>
  song: Partial<Record<CatId, string>>
  sfx: Record<string, string>
}

interface TrackData {
  buffer: AudioBuffer
  timing: TrackTiming
  envelope: Envelope
  onsets: Uint8Array
}

interface CamNodes {
  catId: CatId
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
  t0: number
}

interface SongNodes {
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
}

type BeatCallback = (pos: MusicPosition) => void

export class AudioEngine {
  private ctx: AudioContext | null = null
  private limiter: DynamicsCompressorNode | null = null
  private songBus: GainNode | null = null
  private sfxBus: GainNode | null = null

  private trackData = new Map<TrackId, TrackData>()
  private sfxBuffers = new Map<string, AudioBuffer>()

  private camNodes: CamNodes | null = null
  private songNodes = new Map<CatId, SongNodes>()
  private songT0 = 0
  private songPlaying = false

  private _started = false

  private activeClock: 'cam' | 'song' = 'song'
  private beatDet = createBeatDetector({
    bpm: SONG_TIMING.bpm,
    beatsPerBar: SONG_TIMING.beatsPerBar,
    bars: SONG_TIMING.bars,
  })
  private beatT0 = 0

  private beatCallbacks = new Set<BeatCallback>()
  private barCallbacks = new Set<BeatCallback>()

  get started(): boolean {
    return this._started
  }

  get loaded(): boolean {
    return this.trackData.size > 0 || this.sfxBuffers.size > 0
  }

  async load(
    manifest: AudioManifest,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    type Entry = [TrackId | string, string, 'cam' | 'song' | 'sfx']
    const entries: Entry[] = []

    for (const [catId, url] of Object.entries(manifest.camera) as [CatId, string | undefined][]) {
      if (url) entries.push([`cam:${catId}`, url, 'cam'])
    }
    for (const [catId, url] of Object.entries(manifest.song) as [CatId, string | undefined][]) {
      if (url) entries.push([`song:${catId}`, url, 'song'])
    }
    for (const [id, url] of Object.entries(manifest.sfx)) {
      if (url) entries.push([id, url, 'sfx'])
    }

    const total = entries.length
    let loaded = 0
    let totalDecodedBytes = 0

    await Promise.all(
      entries.map(async ([id, url, kind]) => {
        try {
          const resp = await fetch(url)
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          const arrayBuf = await resp.arrayBuffer()
          const offline = new OfflineAudioContext(1, 1, 44100)
          const buffer = await offline.decodeAudioData(arrayBuf)
          totalDecodedBytes += buffer.numberOfChannels * buffer.length * 4

          if (kind === 'sfx') {
            this.sfxBuffers.set(id, buffer)
          } else {
            let timing: TrackTiming
            if (kind === 'cam') {
              const catId = id.slice(4) as CatId
              const { timing: camTiming, mismatch, computedBars } = computeCamTiming(
                buffer.duration,
                CAMERA_TIMING[catId] ?? {},
              )
              if (mismatch) {
                const spb = (camTiming.beatsPerBar * 60) / camTiming.bpm
                console.warn(
                  `[audio] cam:${catId}: expected ${computedBars} bars` +
                    ` (${(computedBars * spb).toFixed(3)}s),` +
                    ` got ${buffer.duration.toFixed(3)}s`,
                )
              }
              timing = camTiming
            } else {
              timing = SONG_TIMING
            }
            const channels: Float32Array[] = []
            for (let c = 0; c < buffer.numberOfChannels; c++) {
              channels.push(buffer.getChannelData(c))
            }
            const envelope = computeEnvelope(channels, buffer.sampleRate)
            const onsets = detectOnsets(envelope.values)
            this.trackData.set(id, { buffer, timing, envelope, onsets })
          }
        } catch (err) {
          console.error(`[audio] failed to load ${id} (${url}): ${err}`)
          if (kind !== 'sfx') {
            // Insert a 1-second silent placeholder so the track slot exists
            const sampleRate = 44100
            const silentBuffer = new AudioBuffer({ numberOfChannels: 1, length: sampleRate, sampleRate })
            const timing: TrackTiming =
              kind === 'cam'
                ? { bpm: 120, beatsPerBar: 4, bars: 4, loopStartBar: 0, loopEndBar: 4 }
                : SONG_TIMING
            const silence = new Float32Array(sampleRate)
            const envelope = computeEnvelope([silence], sampleRate)
            const onsets = detectOnsets(envelope.values)
            this.trackData.set(id, { buffer: silentBuffer, timing, envelope, onsets })
          }
        }

        loaded++
        onProgress?.(loaded, total)
      }),
    )

    console.log(`[audio] decoded: ${(totalDecodedBytes / 1024 / 1024).toFixed(1)} MB`)

    // Validate song stem lengths against SONG_TIMING and against each other
    const expectedSongDur =
      (SONG_TIMING.bars * SONG_TIMING.beatsPerBar * 60) / SONG_TIMING.bpm
    const songDurations: { id: string; dur: number }[] = []
    for (const [id, data] of this.trackData) {
      if (!id.startsWith('song:')) continue
      const dur = data.buffer.duration
      songDurations.push({ id, dur })
      if (Math.abs(dur - expectedSongDur) > 0.03) {
        console.warn(
          `[audio] ${id}: expected ${expectedSongDur.toFixed(3)}s` +
            ` (${SONG_TIMING.bars} bars), got ${dur.toFixed(3)}s`,
        )
      }
    }
    if (songDurations.length > 1) {
      const ref = songDurations[0]
      for (const { id, dur } of songDurations.slice(1)) {
        if (Math.abs(dur - ref.dur) > 0.03) {
          console.warn(
            `[audio] song stem length mismatch: ${ref.id}=${ref.dur.toFixed(3)}s` +
              ` vs ${id}=${dur.toFixed(3)}s`,
          )
        }
      }
    }
  }

  async start(): Promise<void> {
    if (this._started) return
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    const ctx = this.ctx

    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -6
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 12
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.25
    this.limiter.connect(ctx.destination)

    this.songBus = ctx.createGain()
    this.songBus.gain.value = 0
    this.songBus.connect(this.limiter)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 1.0
    this.sfxBus.connect(this.limiter)

    this._started = true
  }

  setCameraLoop(state: { catId: CatId; gain: number; cutoff: number } | null): void {
    if (!this.ctx || !this.limiter) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const FADE = 0.3
    const TC = 0.05

    if (state === null) {
      if (this.camNodes) {
        this.camNodes.gain.gain.linearRampToValueAtTime(0, now + FADE)
        const src = this.camNodes.source
        setTimeout(() => {
          try {
            src.stop()
          } catch {
            // source may already be stopped
          }
        }, FADE * 1000 + 100)
        this.camNodes = null
      }
      this.activeClock = 'song'
      this._resetBeatDet('song', this.songT0)
      return
    }

    const { catId, gain, cutoff } = state

    if (this.camNodes && this.camNodes.catId === catId) {
      this.camNodes.gain.gain.setTargetAtTime(gain, now, TC)
      this.camNodes.filter.frequency.setTargetAtTime(cutoff, now, TC)
      return
    }

    if (this.camNodes) {
      const oldGain = this.camNodes.gain
      const oldSrc = this.camNodes.source
      oldGain.gain.linearRampToValueAtTime(0, now + FADE)
      setTimeout(() => {
        try {
          oldSrc.stop()
        } catch {
          // source may already be stopped
        }
      }, FADE * 1000 + 100)
    }

    const data = this.trackData.get(`cam:${catId}`)
    if (!data) {
      this.camNodes = null
      return
    }

    const source = ctx.createBufferSource()
    source.buffer = data.buffer
    source.loop = true
    const barDur = (data.timing.beatsPerBar * 60) / data.timing.bpm
    source.loopStart = (data.timing.loopStartBar ?? 0) * barDur
    source.loopEnd = (data.timing.loopEndBar ?? data.timing.bars) * barDur

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    filter.Q.value = 0.5

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + FADE)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.limiter)
    source.start(now)

    this.camNodes = { catId, source, filter, gain: gainNode, t0: now }
    this.activeClock = 'cam'
    this._resetBeatDet('cam', now, catId)
  }

  setSong(state: {
    playing: boolean
    restart?: boolean
    busGain: number
    cutoff: number
    gains: Partial<Record<CatId, number>>
  }): void {
    if (!this.ctx || !this.songBus || !this.limiter) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const TC = 0.05
    const FADE = 0.3

    if (!state.playing) {
      this.songBus.gain.linearRampToValueAtTime(0, now + FADE)
      for (const [, nodes] of this.songNodes) {
        const src = nodes.source
        setTimeout(() => {
          try {
            src.stop()
          } catch {
            // source may already be stopped
          }
        }, FADE * 1000 + 100)
      }
      this.songNodes.clear()
      this.songPlaying = false
      return
    }

    if (state.restart || !this.songPlaying) {
      for (const [, nodes] of this.songNodes) {
        try {
          nodes.source.stop()
        } catch {
          // source may already be stopped
        }
      }
      this.songNodes.clear()

      const t0 = now + 0.05
      this.songT0 = t0

      for (const [trackId, data] of this.trackData) {
        if (!trackId.startsWith('song:')) continue
        const catId = trackId.slice(5) as CatId
        const catGain = state.gains[catId] ?? 0

        const barDur = (data.timing.beatsPerBar * 60) / data.timing.bpm
        const source = ctx.createBufferSource()
        source.buffer = data.buffer
        source.loop = true
        source.loopStart = (data.timing.loopStartBar ?? 0) * barDur
        source.loopEnd = (data.timing.loopEndBar ?? data.timing.bars) * barDur

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = state.cutoff
        filter.Q.value = 0.5

        const gainNode = ctx.createGain()
        gainNode.gain.value = catGain

        source.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(this.songBus)
        source.start(t0)

        this.songNodes.set(catId, { source, filter, gain: gainNode })
      }

      this.songBus.gain.setValueAtTime(0, now)
      this.songBus.gain.linearRampToValueAtTime(state.busGain, now + FADE)
      this.songPlaying = true

      if (this.activeClock === 'song') {
        this._resetBeatDet('song', t0)
      }
    } else {
      this.songBus.gain.setTargetAtTime(state.busGain, now, TC)
      for (const [catId, nodes] of this.songNodes) {
        nodes.gain.gain.setTargetAtTime(state.gains[catId] ?? 0, now, TC)
        nodes.filter.frequency.setTargetAtTime(state.cutoff, now, TC)
      }
    }
  }

  playSfx(id: string, opts?: { gain?: number; detune?: number }): void {
    if (!this.ctx || !this.sfxBus) return
    const buf = this.sfxBuffers.get(id)
    if (!buf) return
    const source = this.ctx.createBufferSource()
    source.buffer = buf
    if (opts?.detune !== undefined) source.detune.value = opts.detune
    const gain = this.ctx.createGain()
    gain.gain.value = opts?.gain ?? 1.0
    source.connect(gain)
    gain.connect(this.sfxBus)
    source.start()
  }

  blip(opts: { freq: number; duration: number; gain: number }): void {
    if (!this.ctx || !this.sfxBus) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const { freq, duration, gain } = opts

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005)
    gainNode.gain.linearRampToValueAtTime(0, now + duration)

    osc.connect(gainNode)
    gainNode.connect(this.sfxBus)
    osc.start(now)
    osc.stop(now + duration + 0.01)
  }

  getAmplitude(trackId: TrackId): number {
    if (!this.ctx || !this._started) return 0
    const data = this.trackData.get(trackId)
    if (!data) return 0
    const elapsed = this._trackElapsed(trackId)
    if (elapsed === null) return 0
    return sampleEnvelope(data.envelope, trackTime(elapsed, data.timing))
  }

  isOnset(trackId: TrackId): boolean {
    if (!this.ctx || !this._started) return false
    const data = this.trackData.get(trackId)
    if (!data) return false
    const elapsed = this._trackElapsed(trackId)
    if (elapsed === null) return false
    const t = trackTime(elapsed, data.timing)
    const idx = Math.floor(t / data.envelope.hopSeconds) % data.onsets.length
    return data.onsets[idx] === 1
  }

  getPosition(trackId: TrackId): MusicPosition | null {
    if (!this.ctx || !this._started) return null
    const data = this.trackData.get(trackId)
    if (!data) return null
    const elapsed = this._trackElapsed(trackId)
    if (elapsed === null) return null
    return trackPosition(elapsed, data.timing)
  }

  onBeat(cb: BeatCallback): () => void {
    this.beatCallbacks.add(cb)
    return () => this.beatCallbacks.delete(cb)
  }

  onBar(cb: BeatCallback): () => void {
    this.barCallbacks.add(cb)
    return () => this.barCallbacks.delete(cb)
  }

  update(): void {
    if (!this._started || !this.ctx) return
    if (this.activeClock === 'song' && !this.songPlaying) return
    if (this.activeClock === 'cam' && !this.camNodes) return
    const elapsed = Math.max(0, this.ctx.currentTime - this.beatT0)
    const { beat, bar } = this.beatDet.update(elapsed)
    if (beat) for (const cb of this.beatCallbacks) cb(beat)
    if (bar) for (const cb of this.barCallbacks) cb(bar)
  }

  private _trackElapsed(trackId: TrackId): number | null {
    if (!this.ctx) return null
    if (trackId.startsWith('cam:')) {
      if (!this.camNodes || this.camNodes.catId !== (trackId.slice(4) as CatId)) return null
      return Math.max(0, this.ctx.currentTime - this.camNodes.t0)
    }
    if (trackId.startsWith('song:')) {
      if (!this.songPlaying) return null
      return Math.max(0, this.ctx.currentTime - this.songT0)
    }
    return null
  }

  getReport(): AudioReport {
    const expectedSongDur = (SONG_TIMING.bars * SONG_TIMING.beatsPerBar * 60) / SONG_TIMING.bpm
    let totalDecodedBytes = 0
    for (const data of this.trackData.values()) {
      totalDecodedBytes += data.buffer.numberOfChannels * data.buffer.length * 4
    }
    for (const buf of this.sfxBuffers.values()) {
      totalDecodedBytes += buf.numberOfChannels * buf.length * 4
    }

    const cats: AudioReport['cats'] = []
    for (const [id, data] of this.trackData) {
      if (id.startsWith('cam:')) {
        const catId = id.slice(4) as CatId
        cats.push({
          catId,
          kind: 'cam',
          duration: data.buffer.duration,
          bars: data.timing.bars,
          channels: data.buffer.numberOfChannels,
          silent: data.buffer.duration <= 1.01 && data.buffer.numberOfChannels === 1,
        })
      } else if (id.startsWith('song:')) {
        const catId = id.slice(5) as CatId
        const ok = Math.abs(data.buffer.duration - expectedSongDur) <= 0.03
        cats.push({
          catId,
          kind: 'song',
          duration: data.buffer.duration,
          bars: data.timing.bars,
          channels: data.buffer.numberOfChannels,
          lengthOk: ok,
          silent: data.buffer.duration <= 1.01 && data.buffer.numberOfChannels === 1,
        })
      }
    }
    return { cats, totalMB: totalDecodedBytes / 1024 / 1024 }
  }

  private _resetBeatDet(clock: 'cam' | 'song', t0: number, catId?: CatId): void {
    this.activeClock = clock
    this.beatT0 = t0
    if (clock === 'cam' && catId) {
      const timing = this.trackData.get(`cam:${catId}`)?.timing
      if (timing) {
        this.beatDet = createBeatDetector({
          bpm: timing.bpm,
          beatsPerBar: timing.beatsPerBar,
          bars: timing.bars,
        })
        return
      }
    }
    this.beatDet = createBeatDetector({
      bpm: SONG_TIMING.bpm,
      beatsPerBar: SONG_TIMING.beatsPerBar,
      bars: SONG_TIMING.bars,
    })
  }
}

export const engine = new AudioEngine()
