import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { engine } from '../audio/AudioEngine'

interface Props {
  onReady: (app: Application) => void
}

export function PixiHost({ onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // StrictMode mounts twice in dev — guard against double-init
    if (initializedRef.current) return
    initializedRef.current = true

    const container = containerRef.current!
    const app = new Application()

    app.init({
      width: 1280,
      height: 720,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColor: 0x12111A,
      antialias: false,
    }).then(() => {
      if (!initializedRef.current) {
        app.destroy(true)
        return
      }
      appRef.current = app
      container.appendChild(app.canvas)

      // Letterbox: fit canvas into container preserving 16:9
      const ro = new ResizeObserver(() => {
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

      // Drive audio engine update from Pixi ticker
      app.ticker.add(() => engine.update())

      onReady(app)
      ;(app as Application & { _ro?: ResizeObserver })._ro = ro
    })

    return () => {
      initializedRef.current = false
      const a = appRef.current
      if (a) {
        const ro = (a as Application & { _ro?: ResizeObserver })._ro
        ro?.disconnect()
        a.destroy(true)
        appRef.current = null
      }
    }
  // onReady is intentionally excluded — ref-stable callers should use useCallback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#12111A', overflow: 'hidden' }}
    />
  )
}
