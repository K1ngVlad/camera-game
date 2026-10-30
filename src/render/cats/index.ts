import type { CatConfig } from '../../data/cats'
import type { CatRenderer } from './types'
import { StaticRenderer } from './StaticRenderer'
import { HornRevealRenderer } from './HornRevealRenderer'
import { WaitRenderer } from './WaitRenderer'
import { UvOnlyRenderer } from './UvOnlyRenderer'

export function createCatRenderer(cat: CatConfig): CatRenderer {
  switch (cat.behavior.type) {
    case 'hornReveal': return new HornRevealRenderer()
    case 'wait': return new WaitRenderer()
    case 'uvOnly': return new UvOnlyRenderer()
    default: return new StaticRenderer()
  }
}

export type { CatRenderer, RenderCtx } from './types'
