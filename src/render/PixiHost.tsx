import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { engine } from '../audio/AudioEngine'

interface Props {
  onReady: (app: Application) => (() => void) | void
}

export function PixiHost({ onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Effect runs once — initial value is sufficient; no render-time mutation needed
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    // cancelled is local to each effect invocation — StrictMode-safe
    let cancelled = false
    let cleanupFromReady: (() => void) | undefined
    let localApp: Application | null = null

    const app = new Application()

    app
      .init({
        width: 1280,
        height: 720,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x12111a,
        antialias: false,
      })
      .then(() => {
        // App initialized after unmount — destroy immediately and bail
        if (cancelled) {
          app.destroy(true)
          return
        }

        localApp = app
        const container = containerRef.current!
        container.appendChild(app.canvas)

        // Canvas fills parent — parent is responsible for sizing (letterbox in GameRoot)
        app.canvas.style.width = '100%'
        app.canvas.style.height = '100%'
        app.canvas.style.display = 'block'

        app.ticker.add(() => engine.update())

        const result = onReadyRef.current(app)
        if (typeof result === 'function') cleanupFromReady = result
      })

    return () => {
      cancelled = true
      cleanupFromReady?.()
      if (localApp) {
        localApp.destroy(true)
        localApp = null
      }
    }
  }, []) // onReady stored in ref — effect runs once

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        // Canvas receives pointer events — individual UI containers above
        // should set pointer-events: none so clicks fall through to Pixi.
      }}
    />
  )
}
