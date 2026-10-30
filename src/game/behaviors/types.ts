import type { CatConfig } from '../../data/cats'
import type { BehaviorEvent, WorldCtx, CatView } from '../types'

export interface Behavior<C, S> {
  init(cat: CatConfig, cfg: C): S
  on(state: S, event: BehaviorEvent, ctx: WorldCtx): S
  view(state: S, ctx: WorldCtx): CatView
}
