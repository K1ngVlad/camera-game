import { useCallback, useEffect, useRef, useState } from 'react'
import type { Application } from 'pixi.js'
import { Assets, Texture } from 'pixi.js'
import { PixiHost } from '../render/PixiHost'
import { CatSprite } from '../render/CatSprite'
import { engine } from '../audio/AudioEngine'
import type { AudioManifest, AudioReport } from '../audio/AudioEngine'
import { CATS } from '../data/cats'
import type { CatId } from '../data/cats'
import { cameraTrack, songStem, sfx as sfxUrl, missingAssets, catFrame, catHasArt } from '../assets/registry'

type AppState = 'idle' | 'loading' | 'ready'
type ClockMode = 'cam' | 'song'

interface CatControl {
  clockMode: ClockMode
  amplitude: number
}

function initControls(): Record<CatId, CatControl> {
  const rec = {} as Record<CatId, CatControl>
  for (const cat of CATS.filter((c) => c.enabled)) {
    rec[cat.id] = { clockMode: 'cam', amplitude: 0 }
  }
  return rec
}

export function Sandbox() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [controls, setControls] = useState<Record<CatId, CatControl>>(initControls)
  const [beatLabel, setBeatLabel] = useState('0.0')
  const [beatFlash, setBeatFlash] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [report, setReport] = useState<AudioReport | null>(null)

  const catSpritesRef = useRef<Map<CatId, CatSprite>>(new Map())
  const rafRef = useRef<number>(0)

  const startAmplitudeLoop = useCallback(() => {
    const loop = () => {
      if (!engine.started) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      setControls((prev) => {
        const next = { ...prev }
        let changed = false
        for (const cat of CATS.filter((c) => c.enabled)) {
          const mode = prev[cat.id]?.clockMode ?? 'cam'
          const trackId = mode === 'cam' ? `cam:${cat.id}` : `song:${cat.id}`
          const a = engine.getAmplitude(trackId)
          if (Math.abs(a - (prev[cat.id]?.amplitude ?? 0)) > 0.005) {
            next[cat.id] = { ...prev[cat.id], amplitude: a }
            changed = true
          }
        }
        return changed ? next : prev
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
    const enabledCats = CATS.filter((c) => c.enabled)
    const manifest: AudioManifest = {
      camera: Object.fromEntries(enabledCats.map((c) => [c.id, cameraTrack(c.id)])),
      song: Object.fromEntries(enabledCats.map((c) => [c.id, songStem(c.id)])),
      sfx: { horn: sfxUrl('horn'), found: sfxUrl('found') },
    }
    await engine.load(manifest, (loaded, total) =>
      setLoadProgress(Math.round((loaded / total) * 100)),
    )
    await engine.start()
    setAppState('ready')
    setMissing(missingAssets())
    setReport(engine.getReport())
    startAmplitudeLoop()
  }

  const handlePixiReady = useCallback((app: Application) => {
    const enabledCats = CATS.filter((c) => c.enabled)
    const spacing = 1280 / (enabledCats.length + 1)
    const y = 340

    let destroyed = false
    let tickerFn: (() => void) | null = null

    const loadSprites = async () => {
      for (let i = 0; i < enabledCats.length; i++) {
        const cat = enabledCats[i]
        const frameUrl = catFrame(cat.id, cat.anim.frames[0] ?? 'body')
        let tex: Texture = Texture.WHITE
        try {
          tex = (await Assets.load(frameUrl)) as Texture
        } catch {
          // use white placeholder
        }

        if (destroyed) return

        const sprite = new CatSprite(cat.id, [tex], cat.anim, (id) => {
          console.log('cat clicked:', id)
        })
        sprite.x = spacing * (i + 1)
        sprite.y = y
        const scale = cat.display.camera / Math.max(tex.height, 1)
        sprite.scale.set(scale)
        app.stage.addChild(sprite)
        catSpritesRef.current.set(cat.id, sprite)
      }

      tickerFn = () => {
        if (!engine.started) return
        const t = performance.now() / 1000
        for (const cat of enabledCats) {
          const sprite = catSpritesRef.current.get(cat.id)
          if (!sprite) continue
          const amp = engine.getAmplitude(`cam:${cat.id}`)
          const onset = engine.isOnset(`cam:${cat.id}`)
          sprite.update(amp, onset, t)
        }
      }
      app.ticker.add(tickerFn)
    }

    loadSprites().catch(console.error)

    return () => {
      destroyed = true
      if (tickerFn) {
        app.ticker.remove(tickerFn)
        tickerFn = null
      }
      catSpritesRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const unsub = engine.onBeat((pos) => {
      setBeatLabel(`${pos.bar + 1}.${pos.beat + 1}`)
      setBeatFlash(true)
      setTimeout(() => setBeatFlash(false), 80)
    })
    return unsub
  }, [])

  const toggleClock = (id: CatId) => {
    setControls((prev) => ({
      ...prev,
      [id]: { ...prev[id], clockMode: prev[id]?.clockMode === 'cam' ? 'song' : 'cam' },
    }))
  }

  const enabledCats = CATS.filter((c) => c.enabled)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#12111A',
        color: '#F4F1E8',
        fontFamily: 'Rubik, sans-serif',
      }}
    >
      {/* Pixi canvas area */}
      <div style={{ flex: '0 0 auto', height: 380, position: 'relative', background: '#0D0C14' }}>
        <PixiHost onReady={handlePixiReady} />
        {appState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => void handleStart()}
              style={{
                background: '#FFB23F',
                color: '#12111A',
                border: '3px solid #12111A',
                borderRadius: 16,
                padding: '14px 32px',
                fontSize: 20,
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 0 #9A5E0E',
              }}
            >
              Нажми, чтобы начать
            </button>
          </div>
        )}
        {appState === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 18, color: '#A9A3C2' }}>Загрузка… {loadProgress}%</div>
            <div style={{ width: 300, height: 8, background: '#221F33', borderRadius: 4 }}>
              <div
                style={{
                  width: `${loadProgress}%`,
                  height: '100%',
                  background: '#FFB23F',
                  borderRadius: 4,
                  transition: 'width 0.1s',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 20,
              padding: '4px 12px',
              background: '#221F33',
              borderRadius: 8,
              color: beatFlash ? '#FFB23F' : '#8BF0A6',
            }}
          >
            {beatFlash ? '●' : '○'} {beatLabel}
          </span>
          <button
            type="button"
            onClick={() => engine.playSfx('horn')}
            style={{
              background: '#FFB23F',
              color: '#12111A',
              border: '3px solid #12111A',
              borderRadius: 12,
              padding: '6px 18px',
              cursor: 'pointer',
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: '0 4px 0 #9A5E0E',
            }}
          >
            🎺 Клаксон
          </button>
        </div>

        {/* Cat rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 8,
          }}
        >
          {enabledCats.map((cat) => {
            const ctrl = controls[cat.id]
            const mode = ctrl?.clockMode ?? 'cam'
            return (
              <div
                key={cat.id}
                style={{
                  background: '#221F33',
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: '1px solid #3A3655',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    {cat.name} <span style={{ color: '#8BF0A6' }}>({cat.id})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleClock(cat.id)}
                    style={{
                      background: mode === 'cam' ? '#3A3655' : '#1A2A3A',
                      color: '#F4F1E8',
                      border: '1px solid #5A5677',
                      borderRadius: 6,
                      padding: '3px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                  >
                    {mode === 'cam' ? 'cam loop' : 'song stem'}
                  </button>
                  <div
                    style={{
                      width: 60,
                      height: 8,
                      background: '#12111A',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(ctrl?.amplitude ?? 0) * 100}%`,
                        height: '100%',
                        background: (ctrl?.amplitude ?? 0) > 0.7 ? '#FF5A5F' : '#8BF0A6',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Asset report table */}
        {report && (
          <div>
            <p
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#A9A3C2',
                margin: '0 0 6px',
              }}
            >
              Asset report — decoded {report.totalMB.toFixed(1)} MB total
            </p>
            <table
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                borderCollapse: 'collapse',
                width: '100%',
              }}
            >
              <thead>
                <tr style={{ color: '#8BF0A6', textAlign: 'left' }}>
                  <th style={{ padding: '2px 8px 2px 0' }}>Cat</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Art</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Cam loop</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Dur</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Bars</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Song stem</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Dur</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Len</th>
                  <th style={{ padding: '2px 8px 2px 0' }}>Ch</th>
                </tr>
              </thead>
              <tbody>
                {CATS.filter((c) => c.enabled).map((cat) => {
                  const cam = report.cats.find((r) => r.catId === cat.id && r.kind === 'cam')
                  const song = report.cats.find((r) => r.catId === cat.id && r.kind === 'song')
                  const hasArt = catHasArt(cat.id)
                  return (
                    <tr key={cat.id} style={{ color: '#F4F1E8', borderTop: '1px solid #2A2740' }}>
                      <td style={{ padding: '3px 8px 3px 0', color: '#A9A3C2' }}>{cat.id}</td>
                      <td style={{ padding: '3px 8px 3px 0', color: hasArt ? '#8BF0A6' : '#FF8B8B' }}>
                        {hasArt ? 'art' : 'stub'}
                      </td>
                      <td style={{ padding: '3px 8px 3px 0', color: cam ? (cam.silent ? '#FFB23F' : '#8BF0A6') : '#FF8B8B' }}>
                        {cam ? (cam.silent ? 'stub' : 'ok') : 'none'}
                      </td>
                      <td style={{ padding: '3px 8px 3px 0' }}>{cam ? cam.duration.toFixed(2) + 's' : '—'}</td>
                      <td style={{ padding: '3px 8px 3px 0' }}>{cam ? cam.bars : '—'}</td>
                      <td style={{ padding: '3px 8px 3px 0', color: song ? (song.silent ? '#FFB23F' : '#8BF0A6') : '#FF8B8B' }}>
                        {song ? (song.silent ? 'stub' : 'ok') : 'none'}
                      </td>
                      <td style={{ padding: '3px 8px 3px 0' }}>{song ? song.duration.toFixed(2) + 's' : '—'}</td>
                      <td style={{ padding: '3px 8px 3px 0', color: song?.lengthOk === false ? '#FF8B8B' : '#8BF0A6' }}>
                        {song ? (song.lengthOk ? '✓' : '⚠') : '—'}
                      </td>
                      <td style={{ padding: '3px 8px 3px 0' }}>{song ? song.channels : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Missing assets */}
        {missing.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                color: '#FF8B8B',
                margin: '0 0 6px',
              }}
            >
              Missing assets ({missing.length}):
            </p>
            <ul
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                color: '#A9A3C2',
                margin: 0,
                padding: '0 0 0 16px',
                listStyle: 'disc',
              }}
            >
              {missing.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
