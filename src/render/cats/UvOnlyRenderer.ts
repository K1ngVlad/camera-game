import { Graphics, Texture, BlurFilter, Container } from 'pixi.js'
import type { CatView } from '../../game/types'
import type { CatRenderer, RenderCtx } from './types'
import { CatSprite } from '../CatSprite'
import { catFrame } from '../../assets/registry'
import { dispatch } from '../../game/dispatch'
import { engine } from '../../audio/AudioEngine'
import { CAMERA_VIEWPORT } from '../../app/layout'

const VP = CAMERA_VIEWPORT
const CAT_X = VP.w * 0.5
const CAT_Y = VP.h * 0.85

// Glow defaults (calibrate once real art is available)
const GLOW_Y_OFFSET = VP.h * 0.12   // px above CAT_Y anchor
const GLOW_RADIUS = VP.h * 0.07     // outer glow radius
const GLOW_CORE_RADIUS = GLOW_RADIUS * 0.35
const GLOW_COLOR = 0xf28c28

const SILHOUETTE_ALPHA = 0.06
const FADE_SPEED = (1 - SILHOUETTE_ALPHA) / 0.2  // full transition in 0.2s

export class UvOnlyRenderer implements CatRenderer {
  private catSprite: CatSprite | null = null
  private glowContainer: Container | null = null
  private catBaseScale = 0.6
  private catAlphaCurrent = SILHOUETTE_ALPHA
  private catAlphaTarget = SILHOUETTE_ALPHA

  enter(view: CatView, ctx: RenderCtx): void {
    this.destroyAll()
    this.createGlow(ctx)
    this.createCat(view, ctx)
  }

  update(view: CatView, _prev: CatView | null, ctx: RenderCtx): void {
    if (!this.catSprite) {
      this.enter(view, ctx)
      return
    }
    this.catAlphaTarget = view.catState === 'lit' ? 1 : SILHOUETTE_ALPHA
    this.catSprite.eventMode = view.clickable ? 'static' : 'none'
  }

  tick(dt: number, ctx: RenderCtx): void {
    const sprite = this.catSprite
    if (!sprite) return

    const t = performance.now() / 1000

    // Smooth dark ↔ lit transition
    const step = FADE_SPEED * dt
    if (Math.abs(this.catAlphaTarget - this.catAlphaCurrent) <= step) {
      this.catAlphaCurrent = this.catAlphaTarget
    } else {
      this.catAlphaCurrent += Math.sign(this.catAlphaTarget - this.catAlphaCurrent) * step
    }
    sprite.alpha = this.catAlphaCurrent

    // Pumpkin glow: pulse with amplitude
    if (this.glowContainer) {
      const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
      this.glowContainer.alpha = 0.35 + 0.5 * amp
    }

    // Normal animation only when fully lit
    if (this.catAlphaCurrent > 0.5) {
      const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
      const onset = engine.isOnset(`cam:${ctx.cat.id}`)
      sprite.update(amp, onset, t)
    }
  }

  destroy(): void {
    this.destroyAll()
  }

  private destroyAll(): void {
    this.catSprite?.destroy()
    this.catSprite = null
    this.glowContainer?.destroy()
    this.glowContainer = null
  }

  private createGlow(ctx: RenderCtx): void {
    const container = new Container()

    // Outer blurred glow
    const outer = new Graphics()
    outer.circle(0, 0, GLOW_RADIUS).fill({ color: GLOW_COLOR, alpha: 1 })
    outer.filters = [new BlurFilter({ strength: 16 })]
    container.addChild(outer)

    // Soft inner core (no blur, smaller)
    const core = new Graphics()
    core.circle(0, 0, GLOW_CORE_RADIUS).fill({ color: GLOW_COLOR, alpha: 0.8 })
    container.addChild(core)

    container.x = CAT_X
    container.y = CAT_Y - GLOW_Y_OFFSET
    container.eventMode = 'none'
    ctx.layers.emissive.addChild(container)
    this.glowContainer = container
  }

  private createCat(view: CatView, ctx: RenderCtx): void {
    const { cat, layers, loadTexture } = ctx
    const frameUrl = catFrame(cat.id, cat.anim.frames[0] ?? 'body')

    const sprite = new CatSprite(cat.id, [Texture.WHITE], cat.anim, () => {
      dispatch({ type: 'clickCat', target: cat.id })
    })
    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.scale.set(this.catBaseScale)
    sprite.tint = parseInt(cat.tint.replace('#', ''), 16)
    sprite.eventMode = view.clickable ? 'static' : 'none'

    // Cat always goes in emissive so it appears above the blackout/UV overlays
    layers.emissive.addChild(sprite)
    this.catSprite = sprite

    this.catAlphaTarget = view.catState === 'lit' ? 1 : SILHOUETTE_ALPHA
    this.catAlphaCurrent = this.catAlphaTarget  // snap on enter, no fade
    sprite.alpha = this.catAlphaCurrent

    loadTexture(frameUrl)
      .then((tex) => {
        if (this.catSprite !== sprite) return
        const scale = cat.display.camera / Math.max(tex.height, 1)
        this.catBaseScale = scale
        sprite.scale.set(scale)
        sprite.tint = 0xffffff
        sprite.setTextures([tex])
      })
      .catch(() => {})
  }
}
