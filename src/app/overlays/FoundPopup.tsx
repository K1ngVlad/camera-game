import { useAtomValue } from 'jotai'
import { store } from '../../state/store'
import { popupAtom } from '../../state/selectors'
import { dispatch } from '../../game/dispatch'
import { CAT_MAP } from '../../data/cats'

export function FoundPopup() {
  const catId = useAtomValue(popupAtom, { store })

  if (!catId) return null

  const cat = CAT_MAP.get(catId)
  if (!cat) return null

  function handleClose() {
    dispatch({ type: 'closePopup' })
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(18,17,26,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        pointerEvents: 'auto',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'var(--text)',
          borderRadius: 20,
          padding: '32px 40px',
          maxWidth: 380,
          textAlign: 'center',
          boxShadow: '0 8px 0 var(--bg-deep)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Medallion */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: cat.tint + '33',
            border: `4px solid ${cat.tint}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 50,
          }}
        >
          🐱
        </div>

        {/* Stamp for special cats */}
        {cat.stamp && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'transparent',
              border: '3px solid #ff3333',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 11,
              color: '#ff3333',
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 800,
              transform: 'rotate(12deg)',
            }}
          >
            {cat.stamp}
          </div>
        )}

        {/* Cat name */}
        <h2
          style={{
            fontFamily: 'Unbounded, sans-serif',
            fontWeight: 800,
            fontSize: 24,
            color: 'var(--bg-deep)',
            margin: 0,
          }}
        >
          {cat.name}
        </h2>

        <p
          style={{
            fontFamily: 'Rubik, sans-serif',
            fontSize: 14,
            color: '#5a5070',
            margin: 0,
          }}
        >
          Партия: {cat.stem}
        </p>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            marginTop: 8,
            background: 'var(--accent)',
            color: 'var(--bg-deep)',
            border: '3px solid var(--bg-deep)',
            borderRadius: 12,
            padding: '12px 32px',
            fontSize: 16,
            fontFamily: 'Unbounded, sans-serif',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 0 var(--accent-shadow)',
          }}
        >
          Мяу!
        </button>
      </div>
    </div>
  )
}
