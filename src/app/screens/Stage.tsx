import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { saveAtom } from '../../state/atoms'
import { dispatch } from '../../game/dispatch'
import { ENABLED_CATS } from '../../data/cats'
import { GAME_W, GAME_H } from '../layout'

export function Stage() {
  const save = useAtomValue(saveAtom, { store })
  const totalEnabled = ENABLED_CATS.length

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
      {/* Stage backdrop: curtains */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #1a0a1a 0%, #0a0510 60%, #1a1010 100%)',
        }}
      />
      {/* Left curtain */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 80,
          height: '100%',
          background: 'linear-gradient(90deg, #3a1020 0%, #1a0a12 100%)',
          opacity: 0.8,
        }}
      />
      {/* Right curtain */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 80,
          height: '100%',
          background: 'linear-gradient(270deg, #3a1020 0%, #1a0a12 100%)',
          opacity: 0.8,
        }}
      />
      {/* Stage floor */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(180deg, #1a1010 0%, #2a1820 100%)',
          borderTop: '2px solid #3a2030',
        }}
      />

      {/* Spotlight */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,180,63,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

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

      {/* Cats on stage */}
      {ENABLED_CATS.map((cat) => {
        const found = save.found.includes(cat.id)
        const x = cat.stagePos.x * GAME_W
        const y = cat.stagePos.y * GAME_H

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
            }}
          >
            {found ? (
              <>
                {/* Cat placeholder circle */}
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: cat.tint + '44',
                    border: `3px solid ${cat.tint}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  🐱
                </div>
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
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{cat.stem}</span>
                </div>
              </>
            ) : (
              <>
                {/* Empty slot */}
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
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
