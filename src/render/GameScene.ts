import {
  Container,
  Sprite,
  TilingSprite,
  NoiseFilter,
  Graphics,
  RenderTexture,
  Texture,
  Assets,
  type Application,
} from 'pixi.js'
import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { getCameraBackground } from './cameraBackground'
import { CATS } from '../data/cats'
import { getCatView } from '../game/behaviors/index'
import { currentCat, worldState } from '../game/progression'
import { CAMERA_VIEWPORT } from '../app/layout'
import { createCatRenderer } from './cats/index'
import type { CatRenderer, RenderCtx } from './cats/index'
import type { CatView } from '../game/types'

const VP = CAMERA_VIEWPORT

// Target alpha values for lighting overlays
const BLACKOUT_ALPHA_NO_UV = 0.93
const BLACKOUT_ALPHA_UV = 0.55
const UV_TINT_ALPHA_BLACKOUT = 0.30
const UV_TINT_ALPHA_NORMAL = 0.28

// Transition durations in seconds
const UV_FADE_SECS = 0.15
const BLACKOUT_END_SECS = 0.8

export class GameScene {
  private app: Application
  private root: Container
  private camContainer: Container
  // Explicit layer order inside camContainer (all at VP-local coords):
  private bgLayer: Container       // 1: camera background
  private worldLayer: Container    // 2: props and cat sprites (darkened in blackout)
  private lightingLayer: Container // 3: dark blackout overlay + UV tint
  private emissiveLayer: Container // 4: self-lit elements (pumpkin glow, cat in UV)
  private bgSprite: Sprite | null = null
  private noiseFilter: NoiseFilter
  private scanlines: TilingSprite | null = null

  // Lighting overlays (inside lightingLayer)
  private blackoutOverlay: Sprite | null = null
  private uvTintOverlay: Sprite | null = null

  // Current and target alpha for smooth transitions
  private blackoutAlphaCurrent = 0
  private blackoutAlphaTarget = 0
  private uvTintAlphaCurrent = 0
  private uvTintAlphaTarget = 0
  // Fade speeds (alpha units per second)
  private blackoutFadeSpeed = 999 // instant by default; set to slow for end-of-blackout
  private uvFadeSpeed = 1 / UV_FADE_SECS

  private currentCameraId = -1
  private noiseAlpha = 0
  private textureCache: Map<string, Texture> = new Map()
  private unsubs: (() => void)[] = []

  private renderer: CatRenderer | null = null
  private renderCtx: RenderCtx | null = null
  private prevView: CatView | null = null

  constructor(app: Application) {
    this.app = app
    this.root = new Container()
    this.camContainer = new Container()
    this.root.addChild(this.camContainer)

    this.camContainer.x = VP.x
    this.camContainer.y = VP.y

    this.noiseFilter = new NoiseFilter({ noise: 0 })
    this.camContainer.filters = [this.noiseFilter]

    // Build layer stack
    this.bgLayer = new Container()
    this.worldLayer = new Container()
    this.lightingLayer = new Container()
    this.emissiveLayer = new Container()
    this.camContainer.addChild(this.bgLayer)
    this.camContainer.addChild(this.worldLayer)
    this.camContainer.addChild(this.lightingLayer)
    this.camContainer.addChild(this.emissiveLayer)

    // Pre-create persistent overlay sprites in lightingLayer
    this.blackoutOverlay = this.makeOverlay(0x05040a, 0)
    this.uvTintOverlay = this.makeOverlay(0x6e46ff, 0)
    this.uvTintOverlay.blendMode = 'add'
    this.lightingLayer.addChild(this.blackoutOverlay)
    this.lightingLayer.addChild(this.uvTintOverlay)

    app.stage.addChild(this.root)
    app.stage.eventMode = 'passive'

    this.createScanlines()
    this.subscribeToStore()
  }

  private makeOverlay(tint: number, alpha: number): Sprite {
    const s = new Sprite(Texture.WHITE)
    s.width = VP.w
    s.height = VP.h
    s.tint = tint
    s.alpha = alpha
    s.eventMode = 'none'
    return s
  }

  private createScanlines() {
    // 1×4 texture: top 2 rows dark, bottom 2 rows transparent → subtle CRT scanline effect
    const g = new Graphics()
    g.rect(0, 0, 1, 2).fill({ color: 0x000000, alpha: 1 })
    const tex = RenderTexture.create({ width: 1, height: 4 })
    this.app.renderer.render({ container: g, target: tex })
    g.destroy()

    this.scanlines = new TilingSprite({ texture: tex, width: VP.w, height: VP.h })
    this.scanlines.x = VP.x
    this.scanlines.y = VP.y
    this.scanlines.alpha = 0.12
    this.scanlines.eventMode = 'none'
    this.root.addChild(this.scanlines)
  }

  private async loadTexture(url: string): Promise<Texture> {
    const cached = this.textureCache.get(url)
    if (cached) return cached
    const tex = (await Assets.load(url)) as Texture
    this.textureCache.set(url, tex)
    return tex
  }

  private subscribeToStore() {
    this.unsubs.push(
      store.sub(sessionAtom, () => {
        const session = store.get(sessionAtom)
        const save = store.get(saveAtom)
        const visible = session.screen === 'cameras'
        this.root.visible = visible
        if (visible) {
          if (session.camera !== this.currentCameraId) {
            this.triggerNoise()
            this.updateCamera(session.camera)
          } else {
            this.rebuildCats(session.camera)
          }
          const ws = worldState(save, session)
          this.updateLighting(session.uv, ws.blackout ?? false)
        }
      }),
    )

    this.unsubs.push(
      store.sub(saveAtom, () => {
        const session = store.get(sessionAtom)
        const save = store.get(saveAtom)
        if (session.screen === 'cameras') {
          this.updateCamera(session.camera)
          const ws = worldState(save, session)
          this.updateLighting(session.uv, ws.blackout ?? false)
        }
      }),
    )
  }

  private triggerNoise() {
    this.noiseAlpha = 1
  }

  private updateCamera(cameraId: number) {
    this.currentCameraId = cameraId

    // Reset renderer — entering a new camera always triggers enter(), not update()
    this.renderer?.destroy()
    this.renderer = null
    this.renderCtx = null
    this.prevView = null

    if (this.bgSprite) {
      this.bgSprite.destroy()
      this.bgSprite = null
    }
    const tex = getCameraBackground(cameraId, this.app)
    this.bgSprite = new Sprite(tex)
    this.bgSprite.width = VP.w
    this.bgSprite.height = VP.h
    this.bgLayer.addChild(this.bgSprite)

    this.rebuildCats(cameraId)
  }

  private rebuildCats(cameraId: number) {
    const save = store.get(saveAtom)
    const session = store.get(sessionAtom)
    const currentId = currentCat(save.found)

    if (!currentId) {
      this.renderer?.destroy()
      this.renderer = null
      this.renderCtx = null
      this.prevView = null
      return
    }

    const cat = CATS.find((c) => c.enabled && c.id === currentId)
    if (!cat) {
      this.renderer?.destroy()
      this.renderer = null
      this.renderCtx = null
      this.prevView = null
      return
    }

    const worldCtx = { screen: session.screen, camera: session.camera, uv: session.uv }
    const view = getCatView(cat, session.puzzle?.state, worldCtx)

    if (view.camera !== cameraId) {
      this.renderer?.destroy()
      this.renderer = null
      this.renderCtx = null
      this.prevView = null
      return
    }

    const ctx: RenderCtx = {
      layers: { world: this.worldLayer, emissive: this.emissiveLayer },
      cat,
      loadTexture: (url) => this.loadTexture(url),
    }

    if (!this.renderer) {
      this.renderCtx = ctx
      this.renderer = createCatRenderer(cat)
      this.renderer.enter(view, ctx)
    } else {
      this.renderer.update(view, this.prevView, ctx)
    }

    this.prevView = view
  }

  private updateLighting(uv: boolean, blackout: boolean) {
    const prevBlackout = this.blackoutAlphaTarget > 0

    if (blackout) {
      this.blackoutAlphaTarget = uv ? BLACKOUT_ALPHA_UV : BLACKOUT_ALPHA_NO_UV
      this.blackoutFadeSpeed = 999 // snap on (sfx:blackout signals it)
      this.uvTintAlphaTarget = uv ? UV_TINT_ALPHA_BLACKOUT : 0
    } else {
      if (prevBlackout) {
        // Blackout just ended — fade out slowly
        this.blackoutAlphaTarget = 0
        this.blackoutFadeSpeed = 1 / BLACKOUT_END_SECS
      } else {
        this.blackoutAlphaTarget = 0
        this.blackoutFadeSpeed = 999
      }
      this.uvTintAlphaTarget = uv ? UV_TINT_ALPHA_NORMAL : 0
    }

    this.uvFadeSpeed = 1 / UV_FADE_SECS
  }

  update(delta: number) {
    const dtSec = delta / 60  // delta is in frames at 60fps

    if (this.noiseAlpha > 0) {
      this.noiseAlpha = Math.max(0, this.noiseAlpha - delta * 0.05)
      this.noiseFilter.noise = this.noiseAlpha * 0.6
      this.noiseFilter.seed = Math.random()
    }

    // Smooth overlay transitions
    this.blackoutAlphaCurrent = lerpTowards(
      this.blackoutAlphaCurrent, this.blackoutAlphaTarget, this.blackoutFadeSpeed, dtSec,
    )
    this.uvTintAlphaCurrent = lerpTowards(
      this.uvTintAlphaCurrent, this.uvTintAlphaTarget, this.uvFadeSpeed, dtSec,
    )
    if (this.blackoutOverlay) this.blackoutOverlay.alpha = this.blackoutAlphaCurrent
    if (this.uvTintOverlay) this.uvTintOverlay.alpha = this.uvTintAlphaCurrent

    if (this.renderer && this.renderCtx) {
      this.renderer.tick(dtSec, this.renderCtx)
    }
  }

  destroy() {
    this.unsubs.forEach((f) => f())
    this.unsubs = []
    this.renderer?.destroy()
    this.renderer = null
    this.renderCtx = null
    this.prevView = null
    this.root.destroy({ children: true })
  }
}

function lerpTowards(current: number, target: number, speed: number, dt: number): number {
  if (current === target) return current
  const step = speed * dt
  if (Math.abs(target - current) <= step) return target
  return current + Math.sign(target - current) * step
}
