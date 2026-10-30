import { useCallback } from 'react'
import { useAtomValue } from 'jotai'
import type { Application } from 'pixi.js'
import { store } from '../../state/store'
import { saveAtom } from '../../state/atoms'
import { dispatch } from '../../game/dispatch'
import { ENABLED_CATS } from '../../data/cats'
import { GAME_W, GAME_H } from '../layout'
import { PixiHost } from '../../render/PixiHost'
import { StageView } from '../../render/StageView'

export function Stage() {
  const save = useAtomValue(saveAtom, { store })
  const totalEnabled = ENABLED_CATS.length

  const handlePixiReady = useCallback((app: Application) => {
    const view = new StageView(app)

    app.ticker.add(() => view.update())

    return () => view.destroy()
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'var(--bg-deep)',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* Pixi stage canvas */}
      <PixiHost onReady={handlePixiReady} />

      {/* HTML overlay — empty slots, labels */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {ENABLED_CATS.map((cat) => {
          const found = save.found.includes(cat.id)
          const x = cat.stagePos.x * GAME_W
          const y = cat.stagePos.y * GAME_H

          if (found) {
            return (
              <div
                key={cat.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-50%, 4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Rubik, sans-serif',
                    fontSize: 11,
                    color: 'var(--text)',
                    textAlign: 'center',
                    textShadow: '0 1px 4px black',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{cat.id}</span>
                </div>
              </div>
            )
          }

          return (
            <div
              key={cat.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: '2px dashed var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 22,
                  opacity: 0.4,
                }}
              >
                ?
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  opacity: 0.4,
                  textShadow: '0 1px 4px black',
                }}
              >
                {cat.name}
              </div>
            </div>
          )
        })}
      </div>

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'rgba(10,8,20,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <h2
          style={{
            fontFamily: 'Unbounded, sans-serif',
            fontWeight: 800,
            fontSize: 22,
            color: 'var(--accent)',
            margin: 0,
          }}
        >
          Сцена · играют {save.found.length} из {totalEnabled}
        </h2>
        <button
          type="button"
          onClick={() => dispatch({ type: 'openScreen', screen: 'office' })}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← Офис
        </button>
      </div>
    </div>
  )
}
