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
import { currentCat } from '../game/progression'
import { CAMERA_VIEWPORT } from '../app/layout'
import { createCatRenderer } from './cats/index'
import type { CatRenderer, RenderCtx } from './cats/index'
import type { CatView } from '../game/types'

const VP = CAMERA_VIEWPORT

export class GameScene {
  private app: Application
  private root: Container
  private camContainer: Container
  private bgSprite: Sprite | null = null
  private noiseFilter: NoiseFilter
  private scanlines: TilingSprite | null = null
  private uvOverlay: Sprite | null = null
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

    app.stage.addChild(this.root)
    app.stage.eventMode = 'passive'

    this.createScanlines()
    this.subscribeToStore()
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
        const visible = session.screen === 'cameras'
        this.root.visible = visible
        if (visible) {
          if (session.camera !== this.currentCameraId) {
            this.triggerNoise()
            this.updateCamera(session.camera)
          } else {
            this.rebuildCats(session.camera)
          }
          this.updateUV(session.uv)
        }
      }),
    )

    this.unsubs.push(
      store.sub(saveAtom, () => {
        const session = store.get(sessionAtom)
        if (session.screen === 'cameras') {
          this.updateCamera(session.camera)
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
    this.camContainer.addChildAt(this.bgSprite, 0)

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
      container: this.camContainer,
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

  private updateUV(uv: boolean) {
    if (uv) {
      if (!this.uvOverlay) {
        const g = new Sprite(Texture.WHITE)
        g.width = VP.w
        g.height = VP.h
        g.tint = 0x6e46ff
        g.alpha = 0.28
        this.uvOverlay = g
        this.camContainer.addChild(this.uvOverlay)
      }
    } else if (this.uvOverlay) {
      this.uvOverlay.destroy()
      this.uvOverlay = null
    }
  }

  update(delta: number) {
    const dtSec = delta / 60  // delta is in frames at 60fps

    if (this.noiseAlpha > 0) {
      this.noiseAlpha = Math.max(0, this.noiseAlpha - delta * 0.05)
      this.noiseFilter.noise = this.noiseAlpha * 0.6
      this.noiseFilter.seed = Math.random()
    }

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

