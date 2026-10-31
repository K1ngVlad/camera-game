import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { saveAtom } from '../../state/atoms'
import { isStageOpenAtom, currentCatAtom, openCamerasAtom, worldStateAtom } from '../../state/selectors'
import { dispatch } from '../../game/dispatch'
import { ENABLED_CATS, CAT_MAP } from '../../data/cats'
import { Button } from '../ui/Button'

export function Office() {
  const save = useAtomValue(saveAtom, { store })
  const stageOpen = useAtomValue(isStageOpenAtom, { store })
  const currentCatId = useAtomValue(currentCatAtom, { store })
  const openCams = useAtomValue(openCamerasAtom, { store })
  const ws = useAtomValue(worldStateAtom, { store })

  const currentCat = currentCatId ? CAT_MAP.get(currentCatId) : null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--bg)',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Blackout dim overlay: covers background only, interactive content stays bright above it */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 4, 10, 0.55)',
          opacity: ws.blackout ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 40,
          gap: 32,
          boxSizing: 'border-box',
        }}
      >
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2
          style={{
            fontFamily: 'Unbounded, sans-serif',
            fontWeight: 800,
            fontSize: 28,
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Штаб
        </h2>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'openScreen', screen: 'menu' })}
        >
          Меню
        </Button>
      </div>

      {/* Current search */}
      {currentCat && (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '16px 24px',
            color: 'var(--text)',
            fontSize: 16,
          }}
        >
          Сейчас ищем:{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{currentCat.name}</span>
        </div>
      )}

      {!currentCat && save.found.length > 0 && (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--accent)',
            borderRadius: 12,
            padding: '16px 24px',
            color: 'var(--accent)',
            fontSize: 18,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Все музыканты найдены!
        </div>
      )}

      <div style={{ display: 'flex', gap: 32, flex: 1, alignItems: 'flex-start' }}>
        {/* Band board */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: 24,
            flex: 1,
          }}
        >
          <h3
            style={{
              fontFamily: 'Rubik, sans-serif',
              fontWeight: 700,
              color: 'var(--text-muted)',
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
            }}
          >
            Состав группы
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {ENABLED_CATS.map((cat) => {
              const found = save.found.includes(cat.id)
              return (
                <div
                  key={cat.id}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    background: found ? cat.tint + '33' : 'var(--panel-alt)',
                    border: `2px solid ${found ? cat.tint : 'var(--line)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: found ? cat.tint : 'var(--line)',
                      opacity: found ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: found ? 'var(--text)' : 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    {found ? cat.name : '?'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 240 }}>
          {/* Camera monitor button */}
          <div
            style={{
              background: 'var(--panel)',
              border: '2px solid var(--line)',
              borderRadius: 16,
              padding: 20,
              cursor: 'pointer',
            }}
            role="button"
            tabIndex={0}
            onClick={() => dispatch({ type: 'openScreen', screen: 'cameras' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') dispatch({ type: 'openScreen', screen: 'cameras' })
            }}
          >
            <div
              style={{
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 700,
                color: 'var(--cam)',
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              Смотреть камеры
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Открыто {openCams.length} из 16
            </div>
          </div>

          {/* Stage door */}
          <div
            style={{
              background: 'var(--panel)',
              border: `2px solid ${stageOpen ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 16,
              padding: 20,
              cursor: stageOpen ? 'pointer' : 'default',
              opacity: stageOpen ? 1 : 0.7,
            }}
            role="button"
            tabIndex={stageOpen ? 0 : -1}
            onClick={() => {
              if (stageOpen) dispatch({ type: 'openScreen', screen: 'stage' })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && stageOpen) dispatch({ type: 'openScreen', screen: 'stage' })
            }}
          >
            <div
              style={{
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 700,
                color: stageOpen ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              Сцена
            </div>
            {stageOpen ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Играют {save.found.length} музыканта</div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Нужно минимум 3 кота ({save.found.length} / 3)
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
