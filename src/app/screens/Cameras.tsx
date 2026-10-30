import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { saveAtom, sessionAtom } from '../../state/atoms'
import { openCamerasAtom, availableToolsAtom, hintAtom, currentCatAtom } from '../../state/selectors'
import { dispatch } from '../../game/dispatch'
import { CAMERAS } from '../../data/cameras'
import { CAT_MAP } from '../../data/cats'
import { CAT_DIALOGUES } from '../../data/dialogues'
import { CAMERA_VIEWPORT } from '../layout'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatTimecode(now: number): string {
  const h = Math.floor(now / 3600) % 24
  const m = Math.floor(now / 60) % 60
  const s = Math.floor(now) % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

const startTime = Date.now()

export function Cameras() {
  const save = useAtomValue(saveAtom, { store })
  const session = useAtomValue(sessionAtom, { store })
  const openCams = useAtomValue(openCamerasAtom, { store })
  const tools = useAtomValue(availableToolsAtom, { store })
  const hint = useAtomValue(hintAtom, { store })
  const currentCatId = useAtomValue(currentCatAtom, { store })

  const [hornCooldown, setHornCooldown] = useState(false)
  const [timecode] = useState(() => formatTimecode((Date.now() - startTime) / 1000))

  const currentCamera = CAMERAS.find((c) => c.id === session.camera)
  const currentCat = currentCatId ? CAT_MAP.get(currentCatId) : null
  const hintText =
    currentCatId && CAT_DIALOGUES[currentCatId]
      ? CAT_DIALOGUES[currentCatId].hints[hint.level]?.text
      : null

  function handleHorn() {
    if (hornCooldown) return
    dispatch({ type: 'horn' })
    setHornCooldown(true)
    setTimeout(() => setHornCooldown(false), 1000)
  }

  function handleUV() {
    dispatch({ type: 'toggleUV' })
  }

  // Camera viewport CSS coords
  const vp = CAMERA_VIEWPORT

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Left panel — camera grid (captures clicks) */}
      <div
        style={{
          width: vp.x,
          height: '100%',
          background: 'var(--panel)',
          borderRight: '2px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 12,
          boxSizing: 'border-box',
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: 'openScreen', screen: 'office' })}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
            alignSelf: 'flex-start',
          }}
        >
          ← Офис
        </button>

        {/* 4×4 grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
            flex: 1,
          }}
        >
          {CAMERAS.map((cam) => {
            const isOpen = openCams.includes(cam.id)
            const isSelected = session.camera === cam.id
            return (
              <button
                key={cam.id}
                type="button"
                disabled={!isOpen}
                onClick={() => isOpen && dispatch({ type: 'selectCamera', camera: cam.id })}
                style={{
                  height: 72,
                  background: isSelected ? 'var(--cam-bg)' : 'var(--panel-alt)',
                  border: isSelected
                    ? '2px solid var(--cam)'
                    : isOpen
                      ? '1px solid var(--line)'
                      : '1px dashed var(--line)',
                  borderRadius: 8,
                  color: isSelected ? 'var(--cam)' : isOpen ? 'var(--text)' : 'var(--text-muted)',
                  cursor: isOpen ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  opacity: isOpen ? 1 : 0.4,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                }}
              >
                {isOpen ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pad2(cam.id)}</span>
                    <span style={{ fontSize: 9 }}>{cam.name}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 16 }}>🔒</span>
                    <span style={{ fontSize: 9 }}>{pad2(cam.id)}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Tools */}
        <div style={{ display: 'flex', gap: 8 }}>
          {tools.includes('horn') && (
            <button
              type="button"
              disabled={hornCooldown}
              onClick={handleHorn}
              style={{
                flex: 1,
                background: hornCooldown ? 'var(--panel-alt)' : 'var(--accent)',
                color: hornCooldown ? 'var(--text-muted)' : 'var(--bg-deep)',
                border: '2px solid var(--bg-deep)',
                borderRadius: 10,
                padding: '10px 0',
                fontSize: 13,
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 800,
                cursor: hornCooldown ? 'default' : 'pointer',
                boxShadow: hornCooldown ? 'none' : '0 4px 0 var(--accent-shadow)',
              }}
            >
              🎺 Клаксон
            </button>
          )}
          {tools.includes('uv') && (
            <button
              type="button"
              onClick={handleUV}
              style={{
                flex: 1,
                background: session.uv ? 'var(--uv)' : 'var(--panel-alt)',
                color: session.uv ? 'white' : 'var(--uv)',
                border: `2px solid var(--uv)`,
                borderRadius: 10,
                padding: '10px 0',
                fontSize: 13,
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🔦 УФ
            </button>
          )}
        </div>

        {/* Hint block */}
        {hintText && (
          <div
            style={{
              background: 'var(--panel-alt)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: 'var(--accent)', fontSize: 10, marginBottom: 4 }}>
              {currentCat?.name ?? '?'} — подсказка
            </div>
            {hintText}
          </div>
        )}
      </div>

      {/* Camera viewport frame — HTML overlays on top of Pixi canvas */}
      <div
        style={{
          position: 'absolute',
          left: vp.x,
          top: vp.y,
          width: vp.w,
          height: vp.h,
          pointerEvents: 'none',
        }}
      >
        {/* Top-left: CAM XX · Name */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'rgba(10,10,16,0.6)',
            padding: '4px 10px',
            borderRadius: '0 0 6px 0',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: 'var(--cam)',
          }}
        >
          CAM {currentCamera ? pad2(currentCamera.id) : '??'} · {currentCamera?.name ?? ''}
        </div>

        {/* Top-right: ● REC */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'rgba(10,10,16,0.6)',
            padding: '4px 10px',
            borderRadius: '0 0 0 6px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            color: 'var(--rec)',
          }}
        >
          ● REC
        </div>

        {/* Bottom-left: timecode */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            background: 'rgba(10,10,16,0.6)',
            padding: '4px 10px',
            borderRadius: '0 6px 0 0',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          {timecode}
        </div>

        {/* Bottom-right: UV MODE */}
        {session.uv && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: 'rgba(110,70,255,0.5)',
              padding: '4px 10px',
              borderRadius: '6px 0 0 0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: 'var(--uv)',
              fontWeight: 600,
            }}
          >
            УФ-РЕЖИМ
          </div>
        )}
      </div>

      {/* Right area below camera (assistant block) */}
      <div
        style={{
          position: 'absolute',
          left: vp.x,
          top: vp.y + vp.h,
          width: vp.w,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          boxSizing: 'border-box',
        }}
      >
        {currentCat && (
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              fontStyle: 'italic',
            }}
          >
            Ищем: <span style={{ color: 'var(--accent)' }}>{currentCat.name}</span>
          </div>
        )}
        {save.found.includes(currentCatId ?? ('' as never)) === false &&
          !currentCatId && (
            <div style={{ color: 'var(--cam)', fontSize: 14 }}>Все музыканты найдены!</div>
          )}
      </div>
    </div>
  )
}
