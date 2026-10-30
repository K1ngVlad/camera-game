import { Container, Sprite, ColorMatrixFilter, NoiseFilter, type Application } from 'pixi.js'
import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { getCameraBackground } from './cameraBackground'
import { CatSprite } from './CatSprite'
import { dispatch } from '../game/dispatch'
import { Assets, Texture } from 'pixi.js'
import { CATS, CAT_MAP } from '../data/cats'
import { getCatView } from '../game/behaviors/index'
import { engine } from '../audio/AudioEngine'
import { CAT_ANIM_CONFIGS, type StemId } from '../data/stems'
import { CAMERA_VIEWPORT } from '../app/layout'

const VP = CAMERA_VIEWPORT

export class GameScene {
  private app: Application
  private root: Container
  private camContainer: Container
  private bgSprite: Sprite | null = null
  private noiseFilter: NoiseFilter
  private scanlineFilter: ColorMatrixFilter
  private uvOverlay: Sprite | null = null
  private catSprites: Map<string, CatSprite> = new Map()
  private currentCameraId = -1
  private noiseAlpha = 0
  private texturesLoaded = false
  private texA: Texture | null = null
  private texB: Texture | null = null

  constructor(app: Application) {
    this.app = app
    this.root = new Container()
    this.camContainer = new Container()
    this.root.addChild(this.camContainer)

    this.camContainer.x = VP.x
    this.camContainer.y = VP.y

    this.noiseFilter = new NoiseFilter({ noise: 0 })
    this.scanlineFilter = new ColorMatrixFilter()

    // Scanlines: darken every other row
    this.camContainer.filters = [this.scanlineFilter, this.noiseFilter]

    app.stage.addChild(this.root)
    // Ensure Pixi event system is active so cat sprites receive pointer events
    app.stage.eventMode = 'passive'

    this.loadTextures().catch(console.error)
    this.subscribeToStore()
  }

  private async loadTextures() {
    try {
      this.texA = (await Assets.load('./assets/placeholder/cat_a.svg')) as Texture
      this.texB = (await Assets.load('./assets/placeholder/cat_b.svg')) as Texture
      this.texturesLoaded = true
      this.updateCamera(store.get(sessionAtom).camera)
    } catch {
      // No textures yet — cats won't render
    }
  }

  private subscribeToStore() {
    store.sub(sessionAtom, () => {
      const session = store.get(sessionAtom)
      const visible = session.screen === 'cameras'
      this.root.visible = visible
      if (visible) {
        if (session.camera !== this.currentCameraId) {
          this.triggerNoise()
          this.updateCamera(session.camera)
        }
        this.updateUV(session.uv)
      }
    })

    store.sub(saveAtom, () => {
      const session = store.get(sessionAtom)
      if (session.screen === 'cameras') {
        this.updateCamera(session.camera)
      }
    })
  }

  private triggerNoise() {
    this.noiseAlpha = 1
  }

  private updateCamera(cameraId: number) {
    this.currentCameraId = cameraId

    // Background
    if (this.bgSprite) {
      this.bgSprite.destroy()
      this.bgSprite = null
    }
    const tex = getCameraBackground(cameraId, this.app)
    this.bgSprite = new Sprite(tex)
    this.bgSprite.width = VP.w
    this.bgSprite.height = VP.h
    this.camContainer.addChildAt(this.bgSprite, 0)

    // Rebuild cat sprites for current camera
    this.rebuildCats(cameraId)
  }

  private rebuildCats(cameraId: number) {
    // Remove old cat sprites
    for (const sprite of this.catSprites.values()) {
      sprite.destroy()
    }
    this.catSprites.clear()

    if (!this.texturesLoaded || !this.texA || !this.texB) return

    const save = store.get(saveAtom)

    for (const cat of CATS) {
      if (!cat.enabled) continue
      if (save.found.includes(cat.id)) continue

      const view = getCatView(cat)
      if (view.camera !== cameraId) continue
      if (!view.visible) continue

      const stemId = cat.stem as StemId
      const animCfg = CAT_ANIM_CONFIGS[stemId]
      if (!animCfg) continue

      const textures = animCfg.frames.map((f) =>
        f === 'cat_a' ? this.texA! : this.texB!,
      )

      const catId = cat.id
      const sprite = new CatSprite(stemId, textures, animCfg, () => {
        dispatch({ type: 'clickCat', target: catId })
      })

      // Position cat in viewport
      sprite.x = VP.w * 0.5
      sprite.y = VP.h * 0.85
      sprite.scale.set(0.6)

      // Tint to distinguish cats
      const hex = parseInt(cat.tint.replace('#', ''), 16)
      sprite.tint = hex

      // Enable pointer events only if clickable
      sprite.eventMode = view.clickable ? 'static' : 'none'

      this.camContainer.addChild(sprite)
      this.catSprites.set(cat.id, sprite)
    }
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
    // Fade out noise: noiseAlpha 1→0 over ~20 frames
    if (this.noiseAlpha > 0) {
      this.noiseAlpha = Math.max(0, this.noiseAlpha - delta * 0.05)
      this.noiseFilter.noise = this.noiseAlpha * 0.6
      this.noiseFilter.seed = Math.random()
    }

    // Update cat animations
    const t = performance.now() / 1000
    for (const [id, sprite] of this.catSprites) {
      const cat = CAT_MAP.get(id as import('../data/cats').CatId)
      if (!cat) continue
      const amp = engine.getAmplitude(cat.stem as StemId)
      const onset = engine.isOnset(cat.stem as StemId)
      sprite.update(amp, onset, t)
    }
  }

  destroy() {
    for (const sprite of this.catSprites.values()) sprite.destroy()
    this.catSprites.clear()
    this.root.destroy({ children: true })
  }
}
