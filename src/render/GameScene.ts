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
import { CatSprite } from './CatSprite'
import { dispatch } from '../game/dispatch'
import { CATS, CAT_MAP } from '../data/cats'
import type { CatId } from '../data/cats'
import { getCatView } from '../game/behaviors/index'
import { currentCat } from '../game/progression'
import { engine } from '../audio/AudioEngine'
import { catFrame, prop as propUrl } from '../assets/registry'
import { CAMERA_VIEWPORT } from '../app/layout'
import { createTween, easeOutBack, easeInQuad } from './tween'
import type { Tween } from './tween'

const VP = CAMERA_VIEWPORT

/** Default cat position within the camera viewport */
const CAT_X = VP.w * 0.5
const CAT_Y = VP.h * 0.85

export class GameScene {
  private app: Application
  private root: Container
  private camContainer: Container
  private bgSprite: Sprite | null = null
  private noiseFilter: NoiseFilter
  private scanlines: TilingSprite | null = null
  private uvOverlay: Sprite | null = null
  private catSprites: Map<CatId, CatSprite> = new Map()
  private propSprites: Map<string, Sprite> = new Map()
  private currentCameraId = -1
  private prevCatState: string | null = null
  private catBaseScale = 0.6  // updated once real texture loads
  private binRevealTween: Tween | null = null
  private catRevealTween: Tween | null = null
  private noiseAlpha = 0
  private textureCache: Map<string, Texture> = new Map()
  private unsubs: (() => void)[] = []

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
            // Puzzle state may have changed — rebuild cats with transition awareness
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
    this.prevCatState = null  // entering new camera — no transition

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

  private clearProps() {
    for (const s of this.propSprites.values()) s.destroy()
    this.propSprites.clear()
    this.binRevealTween = null
    this.catRevealTween = null
  }

  private rebuildCats(cameraId: number) {
    for (const sprite of this.catSprites.values()) {
      sprite.destroy()
    }
    this.catSprites.clear()

    const save = store.get(saveAtom)
    const session = store.get(sessionAtom)
    const current = currentCat(save.found)

    if (!current) {
      this.clearProps()
      this.prevCatState = null
      return
    }

    for (const cat of CATS) {
      if (!cat.enabled) continue
      if (cat.id !== current) continue

      const ctx = { screen: session.screen, camera: session.camera, uv: session.uv }
      const view = getCatView(cat, session.puzzle?.state, ctx)
      if (view.camera !== cameraId) {
        this.clearProps()
        this.prevCatState = null
        return
      }

      const newCatState = view.catState
      const wasHidden = this.prevCatState === 'hidden'
      const transitioning = newCatState === 'revealed' && wasHidden

      if (newCatState === 'hidden') {
        // Show bin prop, no cat sprite
        this.clearProps()
        this.createBinProp()
      } else if (transitioning) {
        // Transition: hidden → revealed
        // Keep existing bin sprite (already in propSprites) for fade-out tween
        // Create cat sprite with hidden alpha
        const catSprite = this.createCatSprite(cat, view.clickable)
        catSprite.alpha = 0
        catSprite.scale.set(this.catBaseScale * 0.6)
        this.binRevealTween = createTween(0.4, easeInQuad)
        this.catRevealTween = createTween(0.35, easeOutBack)
      } else {
        // Not a transition (entering camera when already revealed, or any other state)
        this.clearProps()
        if (newCatState !== 'out') {
          this.createCatSprite(cat, view.clickable)
        }
      }

      this.prevCatState = newCatState
    }
  }

  private createBinProp() {
    const url = propUrl('bin')
    const sprite = new Sprite(Texture.WHITE)
    sprite.anchor.set(0.5, 1)
    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.width = 60
    sprite.height = 80
    sprite.tint = 0x44aa77
    sprite.eventMode = 'none'
    this.camContainer.addChild(sprite)
    this.propSprites.set('bin', sprite)

    this.loadTexture(url)
      .then((tex) => {
        if (!this.propSprites.has('bin')) return
        sprite.texture = tex
        sprite.tint = 0xffffff
        // Preserve anchor-at-bottom sizing
        const scale = 80 / Math.max(tex.height, 1)
        sprite.width = tex.width * scale
        sprite.height = tex.height * scale
      })
      .catch(() => { /* placeholder tint remains */ })
  }

  private createCatSprite(cat: typeof CATS[0], clickable: boolean): CatSprite {
    const catId = cat.id
    const { anim } = cat
    const frameUrl = catFrame(catId, anim.frames[0] ?? 'body')

    const sprite = new CatSprite(catId, [Texture.WHITE], anim, () => {
      dispatch({ type: 'clickCat', target: catId })
    })

    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.scale.set(this.catBaseScale)

    const hex = parseInt(cat.tint.replace('#', ''), 16)
    sprite.tint = hex

    sprite.eventMode = clickable ? 'static' : 'none'

    this.camContainer.addChild(sprite)
    this.catSprites.set(cat.id, sprite)

    this.loadTexture(frameUrl)
      .then((tex) => {
        if (!this.catSprites.has(catId)) return
        const scale = cat.display.camera / Math.max(tex.height, 1)
        this.catBaseScale = scale
        // Only update scale if not mid-tween
        if (!this.catRevealTween || this.catRevealTween.done) {
          sprite.scale.set(scale)
        }
        sprite.tint = 0xffffff
        sprite.setTextures([tex])
      })
      .catch(() => { /* placeholder remains */ })

    return sprite
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

    const t = performance.now() / 1000
    const currentCatId = [...this.catSprites.keys()][0] as CatId | undefined

    // Bin trembling animation when in 'hidden' state
    const binSprite = this.propSprites.get('bin')
    if (binSprite && currentCatId) {
      const amp = engine.getAmplitude(`cam:${currentCatId}`)
      // Shake intensity proportional to amplitude
      binSprite.x = CAT_X + (Math.random() - 0.5) * amp * 6
      binSprite.rotation = (Math.random() - 0.5) * amp * 0.07
    }

    // Reveal transition tweens
    if (this.binRevealTween && !this.binRevealTween.done) {
      this.binRevealTween.update(dtSec)
      if (binSprite) {
        binSprite.alpha = 1 - this.binRevealTween.value
        binSprite.scale.y = 1 - this.binRevealTween.value * 0.3
      }
      if (this.binRevealTween.done && binSprite) {
        binSprite.destroy()
        this.propSprites.delete('bin')
      }
    }

    if (this.catRevealTween && !this.catRevealTween.done) {
      this.catRevealTween.update(dtSec)
      const catSprite = currentCatId ? this.catSprites.get(currentCatId) : undefined
      if (catSprite) {
        const tv = this.catRevealTween.value
        catSprite.alpha = tv
        catSprite.scale.set(this.catBaseScale * (0.6 + 0.48 * tv))
      }
      if (this.catRevealTween.done) {
        const catSprite2 = currentCatId ? this.catSprites.get(currentCatId) : undefined
        if (catSprite2) {
          catSprite2.alpha = 1
          catSprite2.scale.set(this.catBaseScale)
          catSprite2.eventMode = 'static'
        }
      }
    }

    // Normal amplitude animation for cat sprites
    for (const [id, sprite] of this.catSprites) {
      // Skip if mid-tween
      if (this.catRevealTween && !this.catRevealTween.done) continue
      const cat = CAT_MAP.get(id)
      if (!cat) continue
      const amp = engine.getAmplitude(`cam:${id}`)
      const onset = engine.isOnset(`cam:${id}`)
      sprite.update(amp, onset, t)
    }
  }

  destroy() {
    this.unsubs.forEach((f) => f())
    this.unsubs = []
    for (const sprite of this.catSprites.values()) sprite.destroy()
    this.catSprites.clear()
    this.clearProps()
    this.root.destroy({ children: true })
  }
}
