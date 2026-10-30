import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { dialogueAtom } from '../../state/selectors'
import { dispatch } from '../../game/dispatch'
import { ASSISTANT_NAME } from '../../data/dialogues'

const CHARS_PER_SEC = 40

export function Dialog() {
  const queue = useAtomValue(dialogueAtom, { store })
  const current = queue[0]

  const [charCount, setCharCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fullTextRef = useRef('')

  // When the current line text changes, reset char count and restart interval
  const currentText = current?.text ?? ''

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!currentText) return

    fullTextRef.current = currentText

    // Defer reset to avoid synchronous setState-in-effect
    let i = 0
    const startId = setTimeout(() => {
      setCharCount(0)
      intervalRef.current = setInterval(() => {
        i++
        setCharCount(i)
        if (i >= currentText.length) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
        }
      }, 1000 / CHARS_PER_SEC)
    }, 0)

    return () => {
      clearTimeout(startId)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentText])

  if (!current) return null

  const typing = charCount < current.text.length
  const displayed = current.text.slice(0, charCount)
  const total = queue.length

  function handleNext() {
    if (typing) {
      // Finish immediately
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setCharCount(current.text.length)
    } else {
      dispatch({ type: 'dialogueNext' })
    }
  }

  function handleSkip() {
    dispatch({ type: 'dialogueSkip' })
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: 'rgba(18,17,26,0.5)',
        }}
      >
        <div
          style={{
            background: 'var(--text)',
            margin: '0 40px 40px',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            boxShadow: '0 -4px 0 var(--bg-deep)',
            cursor: 'pointer',
          }}
          onClick={handleNext}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleNext()
          }}
        >
          {/* Portrait */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              border: '3px solid var(--accent)',
              background: 'var(--panel)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            🐱
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--panel)',
                marginBottom: 6,
              }}
            >
              {current.speaker === ASSISTANT_NAME ? 'Помощник' : current.speaker}
            </div>
            <div
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontSize: 16,
                color: 'var(--bg-deep)',
                lineHeight: 1.5,
              }}
            >
              {displayed}
              {typing && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: '1em',
                    background: 'var(--bg-deep)',
                    marginLeft: 2,
                    verticalAlign: 'middle',
                    animation: 'blink 0.7s step-end infinite',
                  }}
                />
              )}
            </div>
          </div>

          {/* Indicators */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {total > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {queue.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: i === 0 ? 'var(--bg-deep)' : 'var(--text-muted)',
                      opacity: i === 0 ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>
            )}
            {!typing && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Rubik, sans-serif' }}>
                {total > 1 ? 'Далее ▶' : 'Закрыть ▶'}
              </div>
            )}
          </div>
        </div>

        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 16px',
              }}
            >
              Пропустить всё
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
