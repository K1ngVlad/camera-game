import { Graphics, RenderTexture, type Application } from 'pixi.js'

// Seeded pseudo-random (mulberry32)
function seededRng(seed: number) {
  let s = seed | 0
  return () => {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BG_PALETTES = [
  [0x1a1426, 0x12111a], // deep purple
  [0x0d1a14, 0x0a1210], // dark green
  [0x1a1213, 0x120e0f], // dark red
  [0x14141a, 0x0e0e14], // blue-grey
  [0x1a1712, 0x14110e], // warm dark
  [0x121a1a, 0x0e1414], // teal dark
]

type PatternType = 'stripes' | 'bricks' | 'tiles' | 'dots' | 'diagonals' | 'waves'
const PATTERNS: PatternType[] = ['stripes', 'bricks', 'tiles', 'dots', 'diagonals', 'waves']

const cache = new Map<number, RenderTexture>()

export function getCameraBackground(cameraId: number, app: Application): RenderTexture {
  if (cache.has(cameraId)) return cache.get(cameraId)!

  const rng = seededRng(cameraId * 31337)
  const W = 838
  const H = 634

  const palette = BG_PALETTES[Math.floor(rng() * BG_PALETTES.length)]
  const wallColor = palette[0]
  const floorColor = palette[1]
  const patternType = PATTERNS[Math.floor(rng() * PATTERNS.length)]

  const g = new Graphics()

  // Wall
  g.rect(0, 0, W, H * 0.65).fill({ color: wallColor })
  // Floor
  g.rect(0, H * 0.65, W, H * 0.35).fill({ color: floorColor })

  // Wall pattern
  const patternAlpha = 0.08 + rng() * 0.08
  drawPattern(g, patternType, rng, W, H * 0.65, patternAlpha)

  // 1–3 silhouettes
  const silCount = 1 + Math.floor(rng() * 3)
  for (let i = 0; i < silCount; i++) {
    drawSilhouette(g, rng, W, H * 0.65)
  }

  const tex = RenderTexture.create({ width: W, height: H })
  app.renderer.render({ container: g, target: tex })
  g.destroy()

  cache.set(cameraId, tex)
  return tex
}

export function clearCameraBackgroundCache() {
  for (const tex of cache.values()) tex.destroy()
  cache.clear()
}

function drawPattern(
  g: Graphics,
  type: PatternType,
  rng: () => number,
  w: number,
  h: number,
  alpha: number,
) {
  g.setStrokeStyle({ width: 1, color: 0xffffff, alpha })

  switch (type) {
    case 'stripes': {
      const step = 20 + Math.floor(rng() * 20)
      for (let x = 0; x < w; x += step) g.moveTo(x, 0).lineTo(x, h).stroke()
      break
    }
    case 'bricks': {
      const bw = 60
      const bh = 20
      for (let row = 0; row * bh < h; row++) {
        const offset = (row % 2) * (bw / 2)
        for (let col = -1; col * bw < w + bw; col++) {
          const x = col * bw + offset
          const y = row * bh
          g.rect(x, y, bw - 2, bh - 2).stroke()
        }
      }
      break
    }
    case 'tiles': {
      const ts = 30 + Math.floor(rng() * 20)
      for (let x = 0; x < w; x += ts) {
        for (let y = 0; y < h; y += ts) {
          g.rect(x, y, ts - 1, ts - 1).stroke()
        }
      }
      break
    }
    case 'dots': {
      const step = 24
      for (let x = step / 2; x < w; x += step) {
        for (let y = step / 2; y < h; y += step) {
          g.circle(x, y, 2).fill({ color: 0xffffff, alpha })
        }
      }
      break
    }
    case 'diagonals': {
      const step = 30
      for (let i = -h; i < w + h; i += step) {
        g.moveTo(i, 0).lineTo(i + h, h).stroke()
      }
      break
    }
    case 'waves': {
      const amp = 8
      const freq = 0.04
      for (let row = 20; row < h; row += 20) {
        g.moveTo(0, row)
        for (let x = 1; x < w; x += 4) {
          g.lineTo(x, row + Math.sin(x * freq) * amp)
        }
        g.stroke()
      }
      break
    }
  }
}

type SilhouetteType = 'door' | 'window' | 'boxes' | 'shelf' | 'streetlight' | 'moon'

function drawSilhouette(g: Graphics, rng: () => number, w: number, wallH: number) {
  const types: SilhouetteType[] = ['door', 'window', 'boxes', 'shelf', 'streetlight', 'moon']
  const type = types[Math.floor(rng() * types.length)]
  const x = rng() * (w - 80) + 40
  const alpha = 0.15 + rng() * 0.1
  const color = 0x000000

  switch (type) {
    case 'door': {
      const dw = 50 + rng() * 30
      const dh = 90 + rng() * 40
      g.rect(x, wallH - dh, dw, dh).fill({ color, alpha })
      g.roundRect(x + dw * 0.6, wallH - dh * 0.55, 6, 6, 3).fill({ color: 0xffffff, alpha: 0.2 })
      break
    }
    case 'window': {
      const ww = 60
      const wh = 50
      const wy = wallH * 0.2 + rng() * (wallH * 0.4)
      g.rect(x, wy, ww, wh).fill({ color: 0x1a3a5a, alpha: 0.6 })
      g.rect(x, wy, ww, wh).stroke({ width: 3, color: 0x444444, alpha: 0.8 })
      g.moveTo(x + ww / 2, wy).lineTo(x + ww / 2, wy + wh).stroke({ width: 1, color: 0x444444 })
      g.moveTo(x, wy + wh / 2).lineTo(x + ww, wy + wh / 2).stroke({ width: 1, color: 0x444444 })
      break
    }
    case 'boxes': {
      const n = 2 + Math.floor(rng() * 3)
      for (let i = 0; i < n; i++) {
        const bw = 30 + rng() * 20
        const bh = 25 + rng() * 20
        g.rect(x + i * (bw + 4), wallH - bh - 4, bw, bh).fill({ color, alpha })
      }
      break
    }
    case 'shelf': {
      const sw = 80 + rng() * 60
      const sy = wallH * 0.25 + rng() * (wallH * 0.3)
      g.rect(x, sy, sw, 6).fill({ color: 0x3a2a1a, alpha: 0.6 })
      const items = 2 + Math.floor(rng() * 4)
      for (let i = 0; i < items; i++) {
        const iw = 8 + rng() * 10
        const ih = 15 + rng() * 20
        g.rect(x + i * (sw / items) + 2, sy - ih, iw, ih).fill({ color, alpha: alpha * 0.8 })
      }
      break
    }
    case 'streetlight': {
      g.rect(x, wallH * 0.1, 4, wallH * 0.9).fill({ color, alpha })
      g.rect(x - 20, wallH * 0.1, 24, 4).fill({ color, alpha })
      g.circle(x - 22, wallH * 0.1, 8).fill({ color: 0xffffaa, alpha: 0.3 })
      break
    }
    case 'moon': {
      g.circle(x, wallH * 0.15, 30).fill({ color: 0xffffcc, alpha: 0.15 })
      break
    }
  }
}
