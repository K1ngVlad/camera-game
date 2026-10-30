import { Texture } from 'pixi.js'
import type { CatView } from '../../game/types'
import type { CatRenderer, RenderCtx } from './types'
import { CatSprite } from '../CatSprite'
import { catFrame } from '../../assets/registry'
import { dispatch } from '../../game/dispatch'
import { engine } from '../../audio/AudioEngine'
import { createTween } from '../tween'
import type { Tween } from '../tween'
import { CAMERA_VIEWPORT } from '../../app/layout'

const VP = CAMERA_VIEWPORT
const CAT_X = VP.w * 0.5
const CAT_Y = VP.h * 0.85
const PEEK_X = VP.w - 40
const OFF_X = VP.w + 200

export class WaitRenderer implements CatRenderer {
  private catSprite: CatSprite | null = null
  private catBaseScale = 0.6
  private waitTween: Tween | null = null
  private waitTweenFrom = 0
  private waitTweenTo = 0
  private walkDone = false
  private currentState: string | null = null

  enter(view: CatView, ctx: RenderCtx): void {
    this.destroySprites()
    this.waitTween = null
    this.walkDone = false
    this.currentState = view.catState

    if (view.catState === 'out') {
      const sprite = this.createCatSprite(false, ctx)
      sprite.x = OFF_X
      sprite.visible = false

    } else if (view.catState === 'peek') {
      const sprite = this.createCatSprite(false, ctx)
      sprite.x = PEEK_X

    } else if (view.catState === 'in') {
      const sprite = this.createCatSprite(view.clickable, ctx)
      sprite.x = CAT_X
      this.walkDone = true

    } else {
      this.createCatSprite(view.clickable, ctx)
    }
  }

  update(view: CatView, prev: CatView | null, ctx: RenderCtx): void {
    const { catState } = view
    const prevState = prev?.catState ?? null
    this.currentState = catState

    if (catState === 'out') {
      if (prevState === 'in' || prevState === 'peek') {
        // Flee off-screen right from current position
        if (this.catSprite) {
          const fromX = this.catSprite.x
          this.waitTween = createTween(0.4)
          this.waitTweenFrom = fromX
          this.waitTweenTo = OFF_X
          this.walkDone = false
          this.catSprite.eventMode = 'none'
        }
      } else {
        this.enter(view, ctx)
      }

    } else if (catState === 'peek') {
      if (prevState === 'out') {
        // Slide in from off-screen to peek position
        this.destroySprites()
        this.walkDone = false
        const sprite = this.createCatSprite(false, ctx)
        sprite.x = OFF_X
        sprite.visible = true
        this.waitTween = createTween(0.6)
        this.waitTweenFrom = OFF_X
        this.waitTweenTo = PEEK_X
      }
      // peek → peek: no change needed

    } else if (catState === 'in') {
      if (prevState === 'peek' || prevState === 'out') {
        // Walk in from current position (peek or off-screen)
        this.walkDone = false
        const startX = prevState === 'peek' ? PEEK_X : OFF_X
        if (this.catSprite) {
          this.catSprite.visible = true
          this.catSprite.x = startX
        } else {
          const sprite = this.createCatSprite(false, ctx)
          sprite.x = startX
          sprite.visible = true
        }
        this.waitTween = createTween(1.5)
        this.waitTweenFrom = startX
        this.waitTweenTo = CAT_X
      }
      // in → in (mid-walk or already done): no change

    } else {
      this.enter(view, ctx)
    }
  }

  tick(dt: number, ctx: RenderCtx): void {
    const sprite = this.catSprite
    if (!sprite) return

    const t = performance.now() / 1000

    // Process slide / flee tween
    if (this.waitTween) {
      if (!this.waitTween.done) {
        this.waitTween.update(dt)
        sprite.x = this.waitTweenFrom + (this.waitTweenTo - this.waitTweenFrom) * this.waitTween.value
      }
      if (this.waitTween.done && !this.walkDone) {
        sprite.x = this.waitTweenTo
        if (this.waitTweenTo === CAT_X) {
          this.walkDone = true
          sprite.eventMode = 'static'
        }
      }
    }

    // Peek sway
    if (this.currentState === 'peek' && (!this.waitTween || this.waitTween.done)) {
      sprite.rotation = Math.sin(t * 3) * 0.07
    }

    // Walk rotation during walk-in tween
    if (this.currentState === 'in' && this.waitTween && !this.waitTween.done) {
      sprite.rotation = Math.sin(t * 8) * 0.07
    }

    // Normal amplitude animation (skip while mid-tween)
    const midTween = this.waitTween && !this.waitTween.done
    if (!midTween) {
      const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
      const onset = engine.isOnset(`cam:${ctx.cat.id}`)
      sprite.update(amp, onset, t)
    }
  }

  destroy(): void {
    this.destroySprites()
    this.waitTween = null
    this.walkDone = false
  }

  private destroySprites(): void {
    this.catSprite?.destroy()
    this.catSprite = null
  }

  private createCatSprite(clickable: boolean, ctx: RenderCtx): CatSprite {
    const { cat, layers, loadTexture } = ctx
    const frameUrl = catFrame(cat.id, cat.anim.frames[0] ?? 'body')

    const sprite = new CatSprite(cat.id, [Texture.WHITE], cat.anim, () => {
      dispatch({ type: 'clickCat', target: cat.id })
    })
    sprite.x = CAT_X
    sprite.y = CAT_Y
    sprite.scale.set(this.catBaseScale)
    sprite.tint = parseInt(cat.tint.replace('#', ''), 16)
    sprite.eventMode = clickable ? 'static' : 'none'
    layers.world.addChild(sprite)
    this.catSprite = sprite

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

    return sprite
  }
}
