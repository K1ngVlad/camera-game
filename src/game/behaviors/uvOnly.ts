import type { Behavior } from './types'
import type { CatConfig } from '../../data/cats'

type UvOnlyState = { camera: number }

export const uvOnlyBehavior: Behavior<{ type: 'uvOnly' }, UvOnlyState> = {
  init: (cat: CatConfig) => ({ camera: cat.camera }),

  on: (state) => state,

  view: (state, ctx) => ({
    camera: state.camera,
    catState: ctx.uv ? 'lit' : 'dark',
    clickable: ctx.uv,
    props: {},
    world: { blackout: true },
  }),
}
