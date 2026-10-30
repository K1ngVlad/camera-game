import { Container, Sprite, Graphics, Texture, Assets, type Application } from 'pixi.js'
import { store } from '../state/store'
import { saveAtom, sessionAtom } from '../state/atoms'
import { CATS } from '../data/cats'
import type { CatId } from '../data/cats'
import { CatSprite } from './CatSprite'
import { engine } from '../audio/AudioEngine'
import { catFrame, background } from '../assets/registry'
import { GAME_W, GAME_H } from '../app/layout'

export class StageView {
  private root: Container
  private catSprites: Map<CatId, CatSprite> = new Map()
  private unsubs: (() => void)[] = []

  constructor(app: Application) {
    this.root = new Container()
    app.stage.addChild(this.root)

    this.buildBackground()
    this.subscribeToStore()
  }

  private buildBackground() {
    const bgUrl = background('stage')
    if (bgUrl) {
      Assets.load(bgUrl)
        .then((tex) => {
          const bg = new Sprite(tex as Texture)
          bg.width = GAME_W
          bg.height = GAME_H
          this.root.addChildAt(bg, 0)
        })
        .catch(() => {
          this.root.addChildAt(this.makeFallbackBg(), 0)
        })
    } else {
      this.root.addChildAt(this.makeFallbackBg(), 0)
    }
  }

  private makeFallbackBg(): Graphics {
    const g = new Graphics()
    g.rect(0, 0, GAME_W, GAME_H).fill(0x0a0510)
    return g
  }

  private subscribeToStore() {
    this.unsubs.push(store.sub(saveAtom, () => this.rebuildCats()))
    this.unsubs.push(store.sub(sessionAtom, () => this.rebuildCats()))
    this.rebuildCats()
  }

  private rebuildCats() {
    for (const sprite of this.catSprites.values()) {
      sprite.destroy()
    }
    this.catSprites.clear()

    const save = store.get(saveAtom)
    const foundIds = new Set(save.found)

    const foundCats = CATS.filter((c) => c.enabled && foundIds.has(c.id))
    foundCats.sort((a, b) => a.stagePos.y - b.stagePos.y)

    for (const cat of foundCats) {
      const frameUrl = catFrame(cat.id, cat.anim.frames[0] ?? 'body')
      const sprite = new CatSprite(cat.id, [Texture.WHITE], cat.anim, () => {})

      const x = cat.stagePos.x * GAME_W
      const y = cat.stagePos.y * GAME_H
      sprite.x = x
      sprite.y = y
      sprite.scale.set(0.5)

      this.root.addChild(sprite)
      this.catSprites.set(cat.id, sprite)

      Assets.load(frameUrl)
        .then((tex) => {
          if (!this.catSprites.has(cat.id)) return
          const scale = cat.display.stage / Math.max((tex as Texture).height, 1)
          sprite.scale.set(scale)
          sprite.tint = 0xffffff
          sprite.setTextures([tex as Texture])
        })
        .catch(() => {
          // placeholder remains
        })
    }
  }

  update() {
    const t = performance.now() / 1000
    for (const [id, sprite] of this.catSprites) {
      const amp = engine.getAmplitude(`song:${id}`)
      const onset = engine.isOnset(`song:${id}`)
      sprite.update(amp, onset, t)
    }
  }

  destroy() {
    this.unsubs.forEach((f) => f())
    this.unsubs = []
    for (const sprite of this.catSprites.values()) sprite.destroy()
    this.catSprites.clear()
    this.root.destroy({ children: true })
  }
}
