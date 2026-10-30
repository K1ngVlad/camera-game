import { useEffect, useState } from 'react'
import { Provider, useAtomValue } from 'jotai'
import { store } from '../state/store'
import { sessionAtom } from '../state/atoms'
import { dispatch } from '../game/dispatch'
import { bindMixer } from '../audio/bindMixer'
import { engine } from '../audio/AudioEngine'
import { PixiHost } from '../render/PixiHost'
import { GameScene } from '../render/GameScene'
import type { Application } from 'pixi.js'
import { Menu } from './screens/Menu'
import { Office } from './screens/Office'
import { Cameras } from './screens/Cameras'
import { Stage } from './screens/Stage'
import { Dialog } from './overlays/Dialog'
import { FoundPopup } from './overlays/FoundPopup'
import './ui/tokens.css'
import { GAME_W, GAME_H } from './layout'

function useLetterbox() {
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  useEffect(() => {
    function update() {
      const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H)
      setScale(s)
      setOffsetX(Math.round((window.innerWidth - GAME_W * s) / 2))
      setOffsetY(Math.round((window.innerHeight - GAME_H * s) / 2))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return { scale, offsetX, offsetY }
}

function GameContent() {
  const session = useAtomValue(sessionAtom, { store })

  // Tick every second for hint timers
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'tick', now: Date.now() / 1000 })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Forward bar events from audio engine to game reducer
  useEffect(() => {
    return engine.onBar((pos) => {
      dispatch({ type: 'bar', pos })
    })
  }, [])

  function handlePixiReady(app: Application): (() => void) | void {
    const scene = new GameScene(app)
    app.ticker.add((ticker) => scene.update(ticker.deltaTime))
    return () => scene.destroy()
  }

  return (
    <>
      {/* Pixi canvas — full game field, behind UI */}
      <PixiHost onReady={handlePixiReady} />

      {/* UI layer — containers are pass-through; interactive bits opt in with pointer-events:auto */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      >
        {session.screen === 'menu' && <Menu />}
        {session.screen === 'office' && <Office />}
        {session.screen === 'cameras' && <Cameras />}
        {session.screen === 'stage' && <Stage />}
      </div>

      {/* Overlays */}
      <Dialog />
      <FoundPopup />
    </>
  )
}

export function GameRoot() {
  const { scale, offsetX, offsetY } = useLetterbox()

  // Bind mixer on mount
  useEffect(() => {
    return bindMixer()
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-deep)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: GAME_W,
          height: GAME_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      >
        <Provider store={store}>
          <GameContent />
        </Provider>
      </div>
    </div>
  )
}
