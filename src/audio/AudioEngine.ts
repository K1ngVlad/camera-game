import { computeEnvelope, detectOnsets, sampleEnvelope } from './envelope'
import type { Envelope } from './envelope'
import { positionAt, createBeatDetector } from './clock'
import type { MusicConfig, MusicPosition } from './clock'
import type { StemId, StemMix } from '../data/stems'

type SfxId = string

interface StemNodes {
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
  envelope: Envelope
  onsets: Uint8Array
}

type BeatCallback = (pos: MusicPosition) => void

export class AudioEngine {
  private ctx: AudioContext | null = null
  private config: MusicConfig
  private limiter: DynamicsCompressorNode | null = null

  private stemBuffers = new Map<StemId, AudioBuffer>()
  private sfxBuffers = new Map<SfxId, AudioBuffer>()
  private stemNodes = new Map<StemId, StemNodes>()
  private sfxGain: GainNode | null = null

  private _started = false
  private t0 = 0

  private beatCallbacks: Set<BeatCallback> = new Set()
  private barCallbacks: Set<BeatCallback> = new Set()
  private detector = createBeatDetector({ bpm: 120, beatsPerBar: 4, bars: 16 })

  constructor(config: MusicConfig) {
    this.config = config
    this.detector = createBeatDetector(config)
  }

  get started(): boolean {
    return this._started
  }

  get loaded(): boolean {
    return this.stemBuffers.size > 0
  }

  async load(
    stems: Partial<Record<StemId, string>>,
    sfx: Record<string, string>,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const stemEntries = Object.entries(stems) as [StemId, string][]
    const sfxEntries = Object.entries(sfx)
    const total = stemEntries.length + sfxEntries.length
    let loaded = 0

    const expectedDuration = (this.config.bars * this.config.beatsPerBar * 60) / this.config.bpm

    const decode = async (url: string): Promise<AudioBuffer> => {
      const resp = await fetch(url)
      const arrayBuf = await resp.arrayBuffer()
      // Use OfflineAudioContext to decode without a live context
      const offline = new OfflineAudioContext(1, 1, 44100)
      return offline.decodeAudioData(arrayBuf)
    }

    await Promise.all([
      ...stemEntries.map(async ([id, url]) => {
        const buf = await decode(url)
        const diff = Math.abs(buf.duration - expectedDuration)
        if (diff > 0.05) {
          console.warn(
            `[AudioEngine] Stem "${id}" duration ${buf.duration.toFixed(3)} s differs from expected ${expectedDuration.toFixed(3)} s by ${(diff * 1000).toFixed(0)} ms`,
          )
        }
        // Compute envelopes from all channels
        const channels: Float32Array[] = []
        for (let c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c))
        const envelope = computeEnvelope(channels, buf.sampleRate)
        const onsets = detectOnsets(envelope.values)
        this.stemBuffers.set(id, buf)
        // Store envelope & onsets alongside buffer; nodes created on start()
        // We temporarily store them via a side channel
        ;(buf as AudioBuffer & { _envelope?: Envelope; _onsets?: Uint8Array })._envelope = envelope
        ;(buf as AudioBuffer & { _envelope?: Envelope; _onsets?: Uint8Array })._onsets = onsets
        loaded++
        onProgress?.(loaded, total)
      }),
      ...sfxEntries.map(async ([id, url]) => {
        const buf = await decode(url)
        this.sfxBuffers.set(id, buf)
        loaded++
        onProgress?.(loaded, total)
      }),
    ])
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

    // Build output chain: limiter → destination
    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -6
    this.limiter.knee.value = 6
    this.limiter.ratio.value = 12
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.25
    this.limiter.connect(ctx.destination)

    this.sfxGain = ctx.createGain()
    this.sfxGain.gain.value = 1.0
    this.sfxGain.connect(this.limiter)

    const loopDuration = (this.config.bars * this.config.beatsPerBar * 60) / this.config.bpm

    this.t0 = ctx.currentTime + 0.1

    for (const [id, buf] of this.stemBuffers) {
      const eb = buf as AudioBuffer & { _envelope?: Envelope; _onsets?: Uint8Array }
      const envelope = eb._envelope!
      const onsets = eb._onsets!

      const source = ctx.createBufferSource()
      source.buffer = buf
      source.loop = true
      source.loopStart = 0
      source.loopEnd = loopDuration

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 20000
      filter.Q.value = 0.5

      const gain = ctx.createGain()
      gain.gain.value = 1.0

      source.connect(filter)
      filter.connect(gain)
      gain.connect(this.limiter)

      source.start(this.t0)

      this.stemNodes.set(id, { source, filter, gain, envelope, onsets })
    }

    this._started = true
  }

  setMix(mix: Partial<Record<StemId, StemMix>>): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const TC = 0.05
    for (const [id, { gain, cutoff }] of Object.entries(mix) as [StemId, StemMix][]) {
      const nodes = this.stemNodes.get(id)
      if (!nodes) continue
      nodes.gain.gain.setTargetAtTime(gain, now, TC)
      nodes.filter.frequency.setTargetAtTime(cutoff, now, TC)
    }
  }

  setMasterVolume(v: number): void {
    if (!this.limiter || !this.ctx) return
    // No master gain node yet; future expansion
    void v
  }

  playSfx(id: string, opts?: { volume?: number }): void {
    if (!this.ctx || !this.sfxGain) return
    const buf = this.sfxBuffers.get(id)
    if (!buf) return
    const source = this.ctx.createBufferSource()
    source.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.value = opts?.volume ?? 1.0
    source.connect(gain)
    gain.connect(this.sfxGain)
    source.start()
  }

  getPosition(): MusicPosition {
    if (!this.ctx || !this._started) {
      return positionAt(0, this.config)
    }
    const elapsed = this.ctx.currentTime - this.t0
    return positionAt(Math.max(0, elapsed), this.config)
  }

  getAmplitude(id: StemId): number {
    const nodes = this.stemNodes.get(id)
    if (!nodes) return 0
    const pos = this.getPosition()
    const env = sampleEnvelope(nodes.envelope, pos.loopTime)
    // Multiply by current gain param value (approximate)
    const g = nodes.gain.gain.value
    return Math.min(1, env * g)
  }

  getRawEnvelope(id: StemId): number {
    const nodes = this.stemNodes.get(id)
    if (!nodes) return 0
    const pos = this.getPosition()
    return sampleEnvelope(nodes.envelope, pos.loopTime)
  }

  isOnset(id: StemId): boolean {
    const nodes = this.stemNodes.get(id)
    if (!nodes) return false
    const pos = this.getPosition()
    const hopSec = nodes.envelope.hopSeconds
    const idx = Math.floor(pos.loopTime / hopSec) % nodes.onsets.length
    return nodes.onsets[idx] === 1
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
    const elapsed = Math.max(0, this.ctx.currentTime - this.t0)
    const { beat, bar } = this.detector.update(elapsed)
    if (beat) for (const cb of this.beatCallbacks) cb(beat)
    if (bar) for (const cb of this.barCallbacks) cb(bar)
  }
}

export const engine = new AudioEngine({ bpm: 120, beatsPerBar: 4, bars: 16 })

export function createEngine(config: MusicConfig): AudioEngine {
  return new AudioEngine(config)
}
