import type { Behavior } from './types'
import type { CatConfig } from '../../data/cats'

interface StaticState {
  camera: number
}

export const staticBehavior: Behavior<{ type: 'static' }, StaticState> = {
  init: (cat: CatConfig) => ({ camera: cat.camera }),
  on: (state) => state,
  view: (state) => ({
    camera: state.camera,
    catState: 'visible',
    clickable: true,
    props: {},
  }),
}
