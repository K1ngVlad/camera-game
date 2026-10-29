import { useCallback, useEffect, useRef, useState } from 'react'
import type { Application } from 'pixi.js'
import { Assets, Texture } from 'pixi.js'
import { PixiHost } from '../render/PixiHost'
import { CatSprite } from '../render/CatSprite'
import { engine } from '../audio/AudioEngine'
import {
  STEM_IDS,
  PLACEHOLDER_STEMS,
  PLACEHOLDER_SFX,
  CAT_ANIM_CONFIGS,
  defaultMix,
} from '../data/stems'
import type { StemId, StemMix } from '../data/stems'

type AppState = 'idle' | 'loading' | 'ready'

interface StemControl {
  enabled: boolean
  gain: number
  cutoff: number
  amplitude: number
}

function logCutoff(v: number): number {
  // Map 0..1 slider → 200..20000 Hz (log scale)
  return Math.round(200 * Math.pow(20000 / 200, v))
}

function cutoffToSlider(hz: number): number {
  return Math.log(hz / 200) / Math.log(20000 / 200)
}

const PRESETS: { label: string; mix: Pick<StemMix, 'gain' | 'cutoff'> }[] = [
  { label: 'На камере',  mix: { gain: 1.0,  cutoff: 20000 } },
  { label: 'Соседняя',  mix: { gain: 0.3,  cutoff: 800   } },
  { label: 'Из клуба',  mix: { gain: 0.25, cutoff: 600   } },
  { label: 'Тишина',    mix: { gain: 0,    cutoff: 20000 } },
]

function initControls(): Record<StemId, StemControl> {
  const rec = {} as Record<StemId, StemControl>
  for (const id of STEM_IDS) rec[id] = { enabled: true, gain: 1.0, cutoff: 20000, amplitude: 0 }
  return rec
}

export function Sandbox() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [controls, setControls] = useState<Record<StemId, StemControl>>(initControls)
  const [beatLabel, setBeatLabel] = useState('0.0')
  const [beatFlash, setBeatFlash] = useState(false)

  const catSpritesRef = useRef<Map<StemId, CatSprite>>(new Map())
  const rafRef = useRef<number>(0)
  const totalFilesRef = useRef(0)

  // Amplitude polling loop — updates React state at ~30 fps
  const startAmplitudeLoop = useCallback(() => {
    const loop = () => {
      if (!engine.started) { rafRef.current = requestAnimationFrame(loop); return }
      setControls(prev => {
        const next = { ...prev }
        for (const id of STEM_IDS) {
          const a = engine.getAmplitude(id)
          if (Math.abs(a - prev[id].amplitude) > 0.005) {
            next[id] = { ...prev[id], amplitude: a }
          }
        }
        return next
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const handleStart = async () => {
    setAppState('loading')
    const stemEntries = Object.entries(PLACEHOLDER_STEMS) as [StemId, string][]
    totalFilesRef.current = stemEntries.length + 1
    await engine.load(
      PLACEHOLDER_STEMS,
      PLACEHOLDER_SFX,
      (loaded, total) => setLoadProgress(Math.round((loaded / total) * 100)),
    )
    await engine.start()
    setAppState('ready')
    startAmplitudeLoop()
  }

  const handlePixiReady = useCallback((app: Application) => {
    const catCount = STEM_IDS.length
    const spacing = 1280 / (catCount + 1)
    const y = 620

    const loadTextures = async () => {
      // Load placeholder cat textures
      const texA = await Assets.load('./assets/placeholder/cat_a.svg') as Texture
      const texB = await Assets.load('./assets/placeholder/cat_b.svg') as Texture

      for (let i = 0; i < STEM_IDS.length; i++) {
        const id = STEM_IDS[i]
        const cfg = CAT_ANIM_CONFIGS[id]
        const textures = cfg.frames.map(f => f === 'cat_a' ? texA : texB)

        const cat = new CatSprite(id, textures, cfg, (clickedId) => {
          console.log('cat clicked:', clickedId)
        })
        cat.x = spacing * (i + 1)
        cat.y = y
        app.stage.addChild(cat)
        catSpritesRef.current.set(id, cat)
      }

      // Per-frame cat update — separate from engine.update() ticker
      app.ticker.add(() => {
        if (!engine.started) return
        const t = performance.now() / 1000
        for (const id of STEM_IDS) {
          const cat = catSpritesRef.current.get(id)
          if (!cat) continue
          const amp = engine.getAmplitude(id)
          const onset = engine.isOnset(id)
          cat.update(amp, onset, t)
        }
      })
    }

    loadTextures().catch(console.error)
  }, [])

  // Beat/bar listener
  useEffect(() => {
    const unsub = engine.onBeat(pos => {
      setBeatLabel(`${pos.bar + 1}.${pos.beat + 1}`)
      setBeatFlash(true)
      setTimeout(() => setBeatFlash(false), 80)
    })
    return unsub
  }, [])

  // Apply mix changes to engine
  const applyMix = useCallback((updated: Record<StemId, StemControl>) => {
    const mix = {} as Record<StemId, StemMix>
    for (const id of STEM_IDS) {
      mix[id] = {
        gain: updated[id].enabled ? updated[id].gain : 0,
        cutoff: updated[id].cutoff,
      }
    }
    engine.setMix(mix)
  }, [])

  const toggleStem = (id: StemId) => {
    setControls(prev => {
      const next = { ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }
      applyMix(next)
      return next
    })
  }

  const setGain = (id: StemId, gain: number) => {
    setControls(prev => {
      const next = { ...prev, [id]: { ...prev[id], gain } }
      applyMix(next)
      return next
    })
  }

  const setCutoff = (id: StemId, hz: number) => {
    setControls(prev => {
      const next = { ...prev, [id]: { ...prev[id], cutoff: hz } }
      applyMix(next)
      return next
    })
  }

  const applyPreset = (mix: Pick<StemMix, 'gain' | 'cutoff'>) => {
    setControls(prev => {
      const next = {} as Record<StemId, StemControl>
      for (const id of STEM_IDS) {
        next[id] = { ...prev[id], gain: mix.gain, cutoff: mix.cutoff, enabled: mix.gain > 0 }
      }
      applyMix(next)
      return next
    })
  }

  const applyInitialMix = useCallback(() => {
    engine.setMix(defaultMix())
  }, [])

  useEffect(() => {
    if (appState === 'ready') applyInitialMix()
  }, [appState, applyInitialMix])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#12111A', color: '#F4F1E8', fontFamily: 'Rubik, sans-serif' }}>
      {/* Pixi canvas area */}
      <div style={{ flex: '0 0 auto', height: 400, position: 'relative', background: '#0D0C14' }}>
        <PixiHost onReady={handlePixiReady} />
        {appState === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <button
              type="button"
              onClick={() => { void handleStart() }}
              style={{
                background: '#FFB23F', color: '#12111A', border: '3px solid #12111A',
                borderRadius: 16, padding: '14px 32px', fontSize: 20,
                fontFamily: 'Unbounded, sans-serif', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 6px 0 #9A5E0E',
              }}
            >
              Нажми, чтобы начать
            </button>
          </div>
        )}
        {appState === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 18, color: '#A9A3C2' }}>Загрузка стемов… {loadProgress}%</div>
            <div style={{ width: 300, height: 8, background: '#221F33', borderRadius: 4 }}>
              <div style={{ width: `${loadProgress}%`, height: '100%', background: '#FFB23F', borderRadius: 4, transition: 'width 0.1s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header row: beat indicator, presets, horn */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, padding: '4px 12px',
            background: '#221F33', borderRadius: 8,
            color: beatFlash ? '#FFB23F' : '#8BF0A6',
          }}>
            {beatFlash ? '●' : '○'} {beatLabel}
          </span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.mix)}
              style={{
                background: 'transparent', color: '#F4F1E8', border: '2px solid #3A3655',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Rubik, sans-serif',
                fontSize: 13,
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => engine.playSfx('horn')}
            style={{
              background: '#FFB23F', color: '#12111A', border: '3px solid #12111A',
              borderRadius: 12, padding: '6px 18px', cursor: 'pointer',
              fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: 13,
              boxShadow: '0 4px 0 #9A5E0E',
            }}
          >
            🎺 Клаксон
          </button>
        </div>

        {/* Stem rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 8 }}>
          {STEM_IDS.map(id => {
            const ctrl = controls[id]
            return (
              <div key={id} style={{
                background: '#221F33', borderRadius: 10, padding: '10px 14px',
                border: '1px solid #3A3655', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={ctrl.enabled}
                    onChange={() => toggleStem(id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#FFB23F' }}
                    aria-label={`Toggle ${id}`}
                  />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, flex: 1, color: ctrl.enabled ? '#F4F1E8' : '#A9A3C2' }}>
                    {id}
                  </span>
                  {/* Amplitude meter */}
                  <div style={{ width: 60, height: 8, background: '#12111A', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${ctrl.amplitude * 100}%`, height: '100%',
                      background: ctrl.amplitude > 0.7 ? '#FF5A5F' : '#8BF0A6',
                      borderRadius: 4,
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: '#A9A3C2', width: 36 }}>gain</label>
                  <input
                    type="range" min={0} max={1} step={0.01} value={ctrl.gain}
                    onChange={e => setGain(id, parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: '#FFB23F', cursor: 'pointer' }}
                    aria-label={`Gain for ${id}`}
                  />
                  <span style={{ fontSize: 11, color: '#A9A3C2', width: 34, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {ctrl.gain.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: '#A9A3C2', width: 36 }}>cut</label>
                  <input
                    type="range" min={0} max={1} step={0.001} value={cutoffToSlider(ctrl.cutoff)}
                    onChange={e => setCutoff(id, logCutoff(parseFloat(e.target.value)))}
                    style={{ flex: 1, accentColor: '#8BF0A6', cursor: 'pointer' }}
                    aria-label={`Cutoff for ${id}`}
                  />
                  <span style={{ fontSize: 11, color: '#A9A3C2', width: 54, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {ctrl.cutoff >= 1000 ? `${(ctrl.cutoff / 1000).toFixed(1)}k` : ctrl.cutoff}Hz
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
