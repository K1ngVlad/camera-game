import { Texture } from 'pixi.js'
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

export class StaticRenderer implements CatRenderer {
  private catSprite: CatSprite | null = null
  private catBaseScale = 0.6

  enter(view: CatView, ctx: RenderCtx): void {
    this.destroySprites()
    this.createCatSprite(view.clickable, ctx)
  }

  update(view: CatView, _prev: CatView | null, ctx: RenderCtx): void {
    if (!this.catSprite) {
      this.createCatSprite(view.clickable, ctx)
      return
    }
    this.catSprite.eventMode = view.clickable ? 'static' : 'none'
  }

  tick(_dt: number, ctx: RenderCtx): void {
    if (!this.catSprite) return
    const t = performance.now() / 1000
    const amp = engine.getAmplitude(`cam:${ctx.cat.id}`)
    const onset = engine.isOnset(`cam:${ctx.cat.id}`)
    this.catSprite.update(amp, onset, t)
  }

  destroy(): void {
    this.destroySprites()
  }

  private destroySprites(): void {
    this.catSprite?.destroy()
    this.catSprite = null
  }

  private createCatSprite(clickable: boolean, ctx: RenderCtx): void {
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
        sprite.scale.set(scale)
        sprite.tint = 0xffffff
        sprite.setTextures([tex])
      })
      .catch(() => {})
  }
}
