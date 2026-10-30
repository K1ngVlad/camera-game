import { Sprite, Texture } from 'pixi.js'
import type { CatView } from '../../game/types'
import type { CatRenderer, RenderCtx } from './types'
import { CatSprite } from '../CatSprite'
import { catFrame, prop as propUrl } from '../../assets/registry'
import { dispatch } from '../../game/dispatch'
import { engine } from '../../audio/AudioEngine'
import { createTween, easeInQuad, easeOutBack } from '../tween'
import type { Tween } from '../tween'
import { CAMERA_VIEWPORT } from '../../app/layout'

const VP = CAMERA_VIEWPORT
const CAT_X = VP.w * 0.5
const CAT_Y = VP.h * 0.85

export class HornRevealRenderer implements CatRenderer {
  private catSprite: CatSprite | null = null
  private binSprite: Sprite | null = null
  private catBaseScale = 0.6
  private binRevealTween: Tween | null = null
  private catRevealTween: Tween | null = null

  enter(view: CatView, ctx: RenderCtx): void {
    this.destroyAll()
    if (view.catState === 'hidden') {
      this.createBin(ctx)
    } else {
      this.createCat(view.clickable, ctx)
    }
  }

  update(view: CatView, prev: CatView | null, ctx: RenderCtx): void {
    if (view.catState === 'revealed' && prev?.catState === 'hidden') {
      // Transition: bin → cat with tween
      const sprite = this.createCat(false, ctx)
      sprite.alpha = 0
      sprite.scale.set(this.catBaseScale * 0.6)
      this.binRevealTween = createTween(0.4, easeInQuad)
      this.catRevealTween = createTween(0.35, easeOutBack)
    } else if (view.catState !== prev?.catState) {
      this.enter(view, ctx)
    }
  }

  tick(dt: number, ctx: RenderCtx): void {
    // Bin trembling (even during fade-out)
    if (this.binSprite) {
      const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
      this.binSprite.x = CAT_X + (Math.random() - 0.5) * amp * 6
      this.binSprite.rotation = (Math.random() - 0.5) * amp * 0.07
    }

    // Bin fade-out tween
    if (this.binRevealTween && !this.binRevealTween.done) {
      this.binRevealTween.update(dt)
      if (this.binSprite) {
        this.binSprite.alpha = 1 - this.binRevealTween.value
        this.binSprite.scale.y = 1 - this.binRevealTween.value * 0.3
      }
      if (this.binRevealTween.done && this.binSprite) {
        this.binSprite.destroy()
        this.binSprite = null
      }
    }

    // Cat reveal tween
    if (this.catRevealTween && !this.catRevealTween.done) {
      this.catRevealTween.update(dt)
      if (this.catSprite) {
        const tv = this.catRevealTween.value
        this.catSprite.alpha = tv
        this.catSprite.scale.set(this.catBaseScale * (0.6 + 0.48 * tv))
      }
      if (this.catRevealTween.done && this.catSprite) {
        this.catSprite.alpha = 1
        this.catSprite.scale.set(this.catBaseScale)
        this.catSprite.eventMode = 'static'
      }
    }

    // Normal amplitude animation (skip during reveal tween)
    if (this.catSprite && (!this.catRevealTween || this.catRevealTween.done)) {
      const t = performance.now() / 1000
      const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
      const onset = engine.isOnset(`cam:${ctx.cat.id}`)
      this.catSprite.update(amp, onset, t)
    }
  }

  destroy(): void {
    this.destroyAll()
  }

  private destroyAll(): void {
    this.catSprite?.destroy()
    this.catSprite = null
    this.binSprite?.destroy()
    this.binSprite = null
    this.binRevealTween = null
    this.catRevealTween = null
  }

  private createBin(ctx: RenderCtx): void {
    const url = propUrl('bin')
    const sprite = new Sprite(Texture.WHITE)
    sprite.anchor.set(0.5, 1)
    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.width = 60
    sprite.height = 80
    sprite.tint = 0x44aa77
    sprite.eventMode = 'none'
    ctx.container.addChild(sprite)
    this.binSprite = sprite

    ctx.loadTexture(url)
      .then((tex) => {
        if (this.binSprite !== sprite) return
        sprite.texture = tex
        sprite.tint = 0xffffff
        const scale = 80 / Math.max(tex.height, 1)
        sprite.width = tex.width * scale
        sprite.height = tex.height * scale
      })
      .catch(() => {})
  }

  private createCat(clickable: boolean, ctx: RenderCtx): CatSprite {
    const { cat, container, loadTexture } = ctx
    const frameUrl = catFrame(cat.id, cat.anim.frames[0] ?? 'body')

    const sprite = new CatSprite(cat.id, [Texture.WHITE], cat.anim, () => {
      dispatch({ type: 'clickCat', target: cat.id })
    })
    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.scale.set(this.catBaseScale)
    sprite.tint = parseInt(cat.tint.replace('#', ''), 16)
    sprite.eventMode = clickable ? 'static' : 'none'
    container.addChild(sprite)
    this.catSprite = sprite

    loadTexture(frameUrl)
      .then((tex) => {
        if (this.catSprite !== sprite) return
        const scale = cat.display.camera / Math.max(tex.height, 1)
        this.catBaseScale = scale
        if (!this.catRevealTween || this.catRevealTween.done) {
          sprite.scale.set(scale)
        }
        sprite.tint = 0xffffff
        sprite.setTextures([tex])
      })
      .catch(() => {})

    return sprite
  }
}
