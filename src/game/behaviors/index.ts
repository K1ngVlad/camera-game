import type { CatView, BehaviorEvent, WorldCtx } from '../types'
import type { CatConfig } from '../../data/cats'
import { staticBehavior } from './static'

/** Initialise puzzle state for the given cat. */
export function initPuzzle(cat: CatConfig): unknown {
  switch (cat.behavior.type) {
    case 'static':
      return staticBehavior.init(cat, cat.behavior)
    default:
      // Unimplemented behaviors fall back to static state
      return staticBehavior.init(cat, { type: 'static' })
  }
}

/** Apply a behavior event to the current puzzle state, returning the new state. */
export function applyEvent(
  cat: CatConfig,
  state: unknown,
  event: BehaviorEvent,
  ctx: WorldCtx,
): unknown {
  switch (cat.behavior.type) {
    case 'static': {
      const s = (state as { camera: number } | undefined) ?? staticBehavior.init(cat, cat.behavior)
      return staticBehavior.on(s, event, ctx)
    }
    default:
      return state
  }
}

/** Get the render view for the current cat given its puzzle state. */
export function getCatView(cat: CatConfig, state: unknown, ctx: WorldCtx): CatView {
  switch (cat.behavior.type) {
    case 'static': {
      const s = (state as { camera: number } | undefined) ?? staticBehavior.init(cat, cat.behavior)
      return staticBehavior.view(s, ctx)
    }
    default:
      // Unimplemented behaviors are always visible and clickable (fallback)
      return { camera: cat.camera, catState: 'visible', clickable: true, props: {} }
  }
}
