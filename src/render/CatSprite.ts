import { Container, Sprite, Texture } from 'pixi.js'
import { computeScale, nextFrame } from './CatSprite.logic'
import type { CatAnimConfig } from './CatSprite.logic'
import type { StemId } from '../data/stems'

export class CatSprite extends Container {
  private sprite: Sprite
  private textures: Texture[]
  private cfg: CatAnimConfig
  private frameIndex = 0
  private prevOnset = false
  readonly stemId: StemId

  constructor(
    stemId: StemId,
    textures: Texture[],
    cfg: CatAnimConfig,
    onClick: (id: StemId) => void,
  ) {
    super()
    this.stemId = stemId
    this.textures = textures.length > 0 ? textures : [Texture.WHITE]
    this.cfg = cfg

    this.sprite = new Sprite(this.textures[0])
    this.sprite.anchor.set(0.5, 1)
    this.addChild(this.sprite)

    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointerdown', () => onClick(stemId))
  }

  update(amplitude: number, onset: boolean, timeSec: number): void {
    const { sx, sy } = computeScale(amplitude, this.cfg, timeSec)
    this.sprite.scale.set(sx, sy)

    const newFrame = nextFrame(this.frameIndex, onset, this.cfg, this.prevOnset)
    if (newFrame !== this.frameIndex) {
      this.frameIndex = newFrame
      const tex = this.textures[newFrame % this.textures.length]
      if (tex) this.sprite.texture = tex
    }

    this.prevOnset = onset
  }
}
