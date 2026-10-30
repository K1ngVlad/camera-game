import type { Container, Texture } from 'pixi.js'
import type { CatView } from '../../game/types'
import type { CatConfig } from '../../data/cats'

export interface RenderCtx {
  container: Container
  cat: CatConfig
  loadTexture: (url: string) => Promise<Texture>
}

export interface CatRenderer {
  enter(view: CatView, ctx: RenderCtx): void
  update(view: CatView, prev: CatView | null, ctx: RenderCtx): void
  tick(dt: number, ctx: RenderCtx): void
  destroy(): void
}
