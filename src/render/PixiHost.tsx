import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { engine } from '../audio/AudioEngine'

interface Props {
  onReady: (app: Application) => (() => void) | void
}

export function PixiHost({ onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // cancelled is local to each effect invocation — StrictMode-safe
    let cancelled = false
    let cleanupFromReady: (() => void) | undefined
    let ro: ResizeObserver | null = null
    let localApp: Application | null = null

    const app = new Application()

    app.init({
      width: 1280,
      height: 720,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColor: 0x12111A,
      antialias: false,
    }).then(() => {
      // App initialized after unmount — destroy immediately and bail
      if (cancelled) {
        app.destroy(true)
        return
      }

      localApp = app
      const container = containerRef.current!
      container.appendChild(app.canvas)

      ro = new ResizeObserver(() => {
        const { clientWidth: w, clientHeight: h } = container
        const scale = Math.min(w / 1280, h / 720)
        const cw = Math.round(1280 * scale)
        const ch = Math.round(720 * scale)
        app.canvas.style.width = `${cw}px`
        app.canvas.style.height = `${ch}px`
        app.canvas.style.position = 'absolute'
        app.canvas.style.left = `${Math.round((w - cw) / 2)}px`
        app.canvas.style.top = `${Math.round((h - ch) / 2)}px`
      })
      ro.observe(container)

      app.ticker.add(() => engine.update())

      const result = onReady(app)
      if (typeof result === 'function') cleanupFromReady = result
    })

    return () => {
      cancelled = true
      cleanupFromReady?.()
      ro?.disconnect()
      if (localApp) {
        localApp.destroy(true)
        localApp = null
      }
    }
  // onReady is stable (useCallback with [] in Sandbox) — including in deps
  // ensures the rule is satisfied without causing extra re-runs
  }, [onReady])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#12111A',
        overflow: 'hidden',
      }}
    />
  )
}
