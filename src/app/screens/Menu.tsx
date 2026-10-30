import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { saveAtom } from '../../state/atoms'
import { dispatch } from '../../game/dispatch'
import { engine } from '../../audio/AudioEngine'
import type { AudioManifest } from '../../audio/AudioEngine'
import { CATS } from '../../data/cats'
import { cameraTrack, songStem, sfx as sfxUrl } from '../../assets/registry'
import { Button } from '../ui/Button'

export function Menu() {
  const save = useAtomValue(saveAtom, { store })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(() => engine.loaded)
  const [confirmReset, setConfirmReset] = useState(false)

  const hasSave = save.found.length > 0

  useEffect(() => {
    if (engine.loaded) return
    async function load() {
      setLoading(true)
      const enabledCats = CATS.filter((c) => c.enabled)
      const manifest: AudioManifest = {
        camera: Object.fromEntries(enabledCats.map((c) => [c.id, cameraTrack(c.id)])),
        song: Object.fromEntries(enabledCats.map((c) => [c.id, songStem(c.id)])),
        sfx: { horn: sfxUrl('horn'), found: sfxUrl('found') },
      }
      await engine.load(manifest, (done, total) => {
        setProgress(Math.round((done / total) * 100))
      })
      setLoaded(true)
      setLoading(false)
    }
    void load()
  }, [])

  async function handlePlay() {
    await engine.start()
    dispatch({ type: 'openScreen', screen: 'office' })
  }

  function handleReset() {
    dispatch({ type: 'resetProgress' })
    setConfirmReset(false)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        position: 'relative',
        pointerEvents: 'auto',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: 'Unbounded, sans-serif',
          fontWeight: 800,
          fontSize: 56,
          color: 'var(--text)',
          margin: 0,
          textShadow: '0 4px 0 var(--bg)',
        }}
      >
        Purr-veillance
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 18, margin: 0 }}>
        Найди разбежавшихся котов-музыкантов
      </p>

      {/* Play / Continue button */}
      <Button
        onClick={() => void handlePlay()}
        disabled={!loaded}
        style={{ fontSize: 22, padding: '18px 48px', opacity: loaded ? 1 : 0.6 }}
      >
        {hasSave ? 'Продолжить' : 'Играть'}
      </Button>

      {hasSave && !confirmReset && (
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          Сбросить прогресс
        </Button>
      )}

      {confirmReset && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Точно сбросить весь прогресс?</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={handleReset}>Да, сбросить</Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Loading bar */}
      {(loading || !loaded) && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'var(--panel)',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--accent)',
              transition: 'width 0.1s',
            }}
          />
        </div>
      )}
    </div>
  )
}
